import Phaser from 'phaser'
import i18next from 'i18next'
import {
  getZone,
  type CityNpcConfig,
  type DoorConfig,
  type ExitConfig,
  type ZoneConfig,
} from '../../api/getCityConfig'
import { useGameStore, type InteractionHint } from '../../store/useGameStore'
import { daylightForClock, mixTint, type DaylightTint } from '../daylight'
import {
  createLpcAnimations,
  lpcAnimationKey,
  lpcTextureKey,
  LPC_FRAME_SIZE,
  type Direction,
} from '../lpc'
import { getArrowTarget, isGateOpen } from '../quests/questEngine'
import { sceneKeyForZone, type ZoneSceneData } from './sceneKeys'

const CAMERA_ZOOM = 2
const MOVE_SPEED = 120
const PLAYER_CHARACTER_ID = 'player'
const PLAYER_PLACEHOLDER_TEXTURE = 'player-placeholder'
const NPC_PLACEHOLDER_TEXTURE = 'npc-placeholder'
const PLACEHOLDER_SIZE = 32
// Хітбокс біля ніг, щоб ходити повз стіни і в дверні прорізи.
const FEET_BODY_WIDTH = 20
const FEET_BODY_HEIGHT = 14
const NPC_INTERACTION_RADIUS = 40
const NPC_PATROL_SPEED = 30
const NPC_PATROL_RANGE = 48
const NPC_GREETING_MIN_DELAY = 3000
const NPC_GREETING_MAX_DELAY = 6000
const DOOR_INTERACTION_PADDING = 12
const SPAWN_SAVE_INTERVAL = 500
const FADE_DURATION = 250
const ON_ENTER_DIALOGUE_DELAY = 300
const DAYLIGHT_TRANSITION = 1500
const ARROW_EDGE_INSET = 40
// Зверху більший відступ, щоб стрілка не ховалася під QuestTracker.
const ARROW_TOP_INSET = 110
const ARROW_SIZE = 14
const ARROW_COLOR = 0xffd23f
// Тайлові шари нижче за всіх, спрайти сортуються за y, далі — підписи, тінт доби і стрілка.
const TILE_LAYER_DEPTH = -1000
const GREETING_DEPTH = 100000
const DAYLIGHT_DEPTH = 200000
const ARROW_DEPTH = 300000

// Асети, яких немає на сервері, не пробуємо вантажити знову при кожному вході в зону.
const missingTextures = new Set<string>()

interface NpcEntity {
  config: CityNpcConfig
  sprite: Phaser.GameObjects.Sprite
  animated: boolean
  greetingText: Phaser.GameObjects.Text
  originX: number
  direction: 1 | -1
}

interface GateEntity {
  kind: 'door' | 'exit'
  config: DoorConfig | ExitConfig
  area: Phaser.GameObjects.Zone
  // Вихід спрацьовує тільки після того, як гравець хоч раз був поза ним — щоб не вилетіти одразу після спавну.
  armed: boolean
}

type HintTarget =
  | { kind: 'npc'; npc: CityNpcConfig }
  | { kind: 'door'; gate: GateEntity }

interface GateRect {
  x: number
  y: number
  w: number
  h: number
}

function tilesetTextureKey(name: string) {
  return `tileset:${name}`
}

function landmarkTextureKey(id: string) {
  return `landmark:${id}`
}

// Шлях до зображення тайлсета в Tiled JSON відносний до самої мапи (public/tilemaps/).
function resolveTilemapAsset(image: string) {
  return new URL(image, `${window.location.origin}/tilemaps/`).pathname
}

function bottomOf(sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image) {
  return sprite.y + sprite.displayHeight * (1 - sprite.originY)
}

function tiledProperty(object: Phaser.Types.Tilemaps.TiledObject, name: string) {
  const properties = object.properties as unknown
  if (Array.isArray(properties)) {
    return (properties as { name: string; value: unknown }[]).find(
      (property) => property.name === name,
    )?.value
  }
  if (properties && typeof properties === 'object') {
    return (properties as Record<string, unknown>)[name]
  }
  return undefined
}

/**
 * Спільна основа сцен зон: тайлмапа, гравець, колізії, NPC, landmarks, двері й виходи,
 * підказка взаємодії, стрілка квесту, тінт часу доби і переходи між зонами.
 */
export abstract class ZoneSceneBase extends Phaser.Scene {
  protected zone!: ZoneConfig
  private map!: Phaser.Tilemaps.Tilemap
  private player!: Phaser.Physics.Arcade.Sprite
  private playerAnimated = false
  private facing: Direction = 'down'
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: {
    up: Phaser.Input.Keyboard.Key
    down: Phaser.Input.Keyboard.Key
    left: Phaser.Input.Keyboard.Key
    right: Phaser.Input.Keyboard.Key
  }
  private arrow!: Phaser.GameObjects.Graphics
  private daylight!: Phaser.GameObjects.Rectangle
  private daylightTint: DaylightTint = { color: 0xffffff, alpha: 0 }
  private daylightTween: Phaser.Tweens.Tween | null = null
  private npcEntities: NpcEntity[] = []
  private gates: GateEntity[] = []
  private hintTarget: HintTarget | null = null
  private hintKey: string | null = null
  private lastSavedSpawn: { x: number; y: number } | null = null
  private transitioning = false
  private requestedTextures: string[] = []

  protected abstract readonly backgroundColor: string

  init(data: ZoneSceneData) {
    const city = useGameStore.getState().cityConfig
    if (!city) throw new Error('City config is not loaded')
    this.zone = getZone(city, data.zoneId)
    this.npcEntities = []
    this.gates = []
    this.hintTarget = null
    this.hintKey = null
    this.lastSavedSpawn = null
    this.transitioning = false
    this.playerAnimated = false
    this.facing = 'down'
    this.daylightTween = null
    this.requestedTextures = []
  }

  preload() {
    const tilemapKey = this.tilemapKey()
    const queueTilesets = (data: { tilesets?: { name: string; image?: string }[] }) => {
      for (const tileset of data.tilesets ?? []) {
        if (tileset.image) {
          this.loadImageOnce(
            tilesetTextureKey(tileset.name),
            resolveTilemapAsset(tileset.image),
          )
        }
      }
    }

    const cached = this.cache.tilemap.get(tilemapKey) as { data?: object } | undefined
    if (cached?.data) {
      queueTilesets(cached.data)
    } else {
      this.load.tilemapTiledJSON(tilemapKey, `/tilemaps/${this.zone.tilemap}.json`)
      this.load.once(
        `filecomplete-tilemapJSON-${tilemapKey}`,
        (_key: string, _type: string, data: object) => queueTilesets(data),
      )
    }

    const characterIds = [
      PLAYER_CHARACTER_ID,
      ...this.zone.npcs.flatMap((npc) => (npc.sprite ? [npc.sprite] : [])),
    ]
    for (const id of new Set(characterIds)) {
      this.loadSpritesheetOnce(lpcTextureKey(id), `/assets/lpc/${id}.png`)
    }
    for (const landmark of this.zone.landmarks ?? []) {
      this.loadImageOnce(
        landmarkTextureKey(landmark.id),
        `/assets/landmarks/${landmark.id}.png`,
      )
    }

    this.ensurePlaceholderTexture(PLAYER_PLACEHOLDER_TEXTURE, PLACEHOLDER_SIZE, 0xff5a5f)
    this.ensurePlaceholderTexture(NPC_PLACEHOLDER_TEXTURE, PLACEHOLDER_SIZE, 0xffd23f)
  }

  create() {
    for (const key of this.requestedTextures) {
      if (!this.textures.exists(key)) missingTextures.add(key)
    }

    this.map = this.make.tilemap({ key: this.tilemapKey() })
    const tilesets = this.map.tilesets.flatMap((tileset) => {
      const added = this.map.addTilesetImage(
        tileset.name,
        tilesetTextureKey(tileset.name),
      )
      return added ? [added] : []
    })
    const layers = this.map.layers.flatMap((layerData, index) => {
      const layer = this.map.createLayer(layerData.name, tilesets, 0, 0)
      if (!layer) return []
      layer.setCollisionByProperty({ collides: true })
      layer.setDepth(TILE_LAYER_DEPTH + index)
      return [layer]
    })

    this.createPlayer()
    this.physics.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)
    for (const layer of layers) this.physics.add.collider(this.player, layer)

    this.createLandmarks()
    this.createNpcs()
    this.createGates()

    this.arrow = this.add.graphics().setDepth(ARROW_DEPTH)
    this.createDaylight()
    this.setupCamera()

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    }
    this.input
      .keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E, false)
      .on('down', () => this.interact())

    const unsubscribe = useGameStore.subscribe((state, prev) => {
      if (state.interactRequest !== prev.interactRequest) this.interact()
      if (state.gameClock !== prev.gameClock) this.fadeDaylightTo(state.gameClock)
    })

    this.time.addEvent({
      delay: SPAWN_SAVE_INTERVAL,
      loop: true,
      callback: () => this.saveSpawn(),
    })

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this)

    const handleExit = () => {
      unsubscribe()
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this)
      this.saveSpawn()
      useGameStore.getState().setInteractionHint(null)
    }
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, handleExit)
    this.events.once(Phaser.Scenes.Events.DESTROY, handleExit)

    this.cameras.main.fadeIn(FADE_DURATION)
    this.openEnterDialogue()
  }

  update(_time: number, delta: number) {
    this.player.setVelocity(0)
    this.updateNpcs(delta)

    if (this.transitioning || this.isInputBlocked()) {
      this.animatePlayer(0, 0)
      if (!this.transitioning) this.setHint(null)
      this.drawQuestArrow()
      return
    }

    const left = this.cursors.left.isDown || this.wasd.left.isDown
    const right = this.cursors.right.isDown || this.wasd.right.isDown
    const up = this.cursors.up.isDown || this.wasd.up.isDown
    const down = this.cursors.down.isDown || this.wasd.down.isDown

    const velocityX = left ? -MOVE_SPEED : right ? MOVE_SPEED : 0
    const velocityY = up ? -MOVE_SPEED : down ? MOVE_SPEED : 0
    this.player.setVelocity(velocityX, velocityY)
    this.animatePlayer(velocityX, velocityY)
    this.player.setDepth(bottomOf(this.player))

    this.updateHint()
    this.checkExits()
    this.drawQuestArrow()
  }

  private tilemapKey() {
    return `tilemap_${this.zone.tilemap}`
  }

  private loadImageOnce(key: string, url: string) {
    if (this.textures.exists(key) || missingTextures.has(key)) return
    this.requestedTextures.push(key)
    this.load.image(key, url)
  }

  private loadSpritesheetOnce(key: string, url: string) {
    if (this.textures.exists(key) || missingTextures.has(key)) return
    this.requestedTextures.push(key)
    this.load.spritesheet(key, url, {
      frameWidth: LPC_FRAME_SIZE,
      frameHeight: LPC_FRAME_SIZE,
    })
  }

  private ensurePlaceholderTexture(key: string, size: number, color: number) {
    if (this.textures.exists(key)) return
    const graphics = this.make.graphics({ x: 0, y: 0 })
    graphics.fillStyle(color, 1)
    graphics.fillRect(0, 0, size, size)
    graphics.lineStyle(2, 0x000000, 0.35)
    graphics.strokeRect(1, 1, size - 2, size - 2)
    graphics.generateTexture(key, size, size)
    graphics.destroy()
  }

  private clampToMap(point: { x: number; y: number }) {
    // Позиція зі старого збереження може бути поза меншою мапою — тримаємо гравця всередині стін.
    const minX = this.map.tileWidth * 1.5
    const minY = this.map.tileHeight * 1.5
    return {
      x: Phaser.Math.Clamp(point.x, minX, this.map.widthInPixels - minX),
      y: Phaser.Math.Clamp(point.y, minY, this.map.heightInPixels - minY),
    }
  }

  private createPlayer() {
    const start = this.clampToMap(useGameStore.getState().spawn ?? this.zone.spawn)
    const lpcKey = lpcTextureKey(PLAYER_CHARACTER_ID)
    this.playerAnimated = this.textures.exists(lpcKey)

    if (this.playerAnimated) {
      createLpcAnimations(this, lpcKey)
      this.player = this.physics.add.sprite(start.x, start.y, lpcKey)
      this.player.play(lpcAnimationKey(lpcKey, 'idle', this.facing))
    } else {
      this.player = this.physics.add.sprite(start.x, start.y, PLAYER_PLACEHOLDER_TEXTURE)
    }

    const frameWidth = this.player.width
    const frameHeight = this.player.height
    const body = this.player.body as Phaser.Physics.Arcade.Body
    body.setSize(FEET_BODY_WIDTH, FEET_BODY_HEIGHT)
    // LPC-персонаж стоїть на ~2 px вище низу кадру.
    const feetGap = this.playerAnimated ? 2 : 0
    body.setOffset(
      (frameWidth - FEET_BODY_WIDTH) / 2,
      frameHeight - FEET_BODY_HEIGHT - feetGap,
    )
    this.player.setCollideWorldBounds(true)
    this.player.setDepth(bottomOf(this.player))
  }

  private animatePlayer(velocityX: number, velocityY: number) {
    if (!this.playerAnimated) return
    const key = lpcTextureKey(PLAYER_CHARACTER_ID)
    if (velocityX === 0 && velocityY === 0) {
      this.player.play(lpcAnimationKey(key, 'idle', this.facing), true)
      return
    }
    // Горизонталь має пріоритет при русі по діагоналі.
    if (velocityX !== 0) this.facing = velocityX < 0 ? 'left' : 'right'
    else this.facing = velocityY < 0 ? 'up' : 'down'
    this.player.play(lpcAnimationKey(key, 'walk', this.facing), true)
  }

  private createLandmarks() {
    for (const landmark of this.zone.landmarks ?? []) {
      const key = landmarkTextureKey(landmark.id)
      // Без зображення landmark не показуємо: генератор мап і так малює фасад над дверима.
      if (!this.textures.exists(key)) continue
      const image = this.add
        .image(landmark.x, landmark.y, key)
        .setOrigin(0.5, 1)
        .setScale(landmark.scale ?? 1)
        .setDepth(landmark.y)

      // Колізія лише по нижній третині: за верхню частину будівлі можна зайти.
      const blockHeight = image.displayHeight / 3
      const block = this.add.zone(
        landmark.x,
        landmark.y - blockHeight / 2,
        image.displayWidth,
        blockHeight,
      )
      this.physics.add.existing(block, true)
      this.physics.add.collider(this.player, block)
    }
  }

  private createNpcs() {
    const greeting = i18next.t('world.npcGreeting')
    for (const npc of this.zone.npcs) {
      const lpcKey = npc.sprite ? lpcTextureKey(npc.sprite) : null
      const animated = lpcKey !== null && this.textures.exists(lpcKey)
      let sprite: Phaser.GameObjects.Sprite
      if (animated) {
        createLpcAnimations(this, lpcKey)
        sprite = this.add.sprite(npc.x, npc.y, lpcKey)
        sprite.play(lpcAnimationKey(lpcKey, 'idle', 'down'))
      } else {
        sprite = this.add.sprite(npc.x, npc.y, NPC_PLACEHOLDER_TEXTURE)
      }
      sprite.setDepth(bottomOf(sprite))

      const greetingText = this.add
        .text(npc.x, this.greetingY(sprite), greeting, {
          fontFamily: 'sans-serif',
          fontSize: '8px',
          color: '#111111',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: { x: 3, y: 2 },
          resolution: CAMERA_ZOOM * 2,
        })
        .setOrigin(0.5, 1)
        .setAlpha(0)
        .setDepth(GREETING_DEPTH)

      const entity: NpcEntity = {
        config: npc,
        sprite,
        animated,
        greetingText,
        originX: npc.x,
        direction: Math.random() < 0.5 ? 1 : -1,
      }
      this.npcEntities.push(entity)
      this.scheduleNpcGreeting(entity)
    }
  }

  private greetingY(sprite: Phaser.GameObjects.Sprite) {
    // У LPC-кадрі голова починається приблизно на чверті висоти.
    const headOffset = sprite.displayHeight * (sprite.width === LPC_FRAME_SIZE ? 0.25 : 0.5)
    return sprite.y - headOffset - 2
  }

  private gateOverrides() {
    // Об'єкти шарів doors/exits з Tiled з властивістю id перекривають координати з конфігу.
    const overrides = new Map<string, GateRect>()
    for (const layerName of ['doors', 'exits'] as const) {
      const layer = this.map.getObjectLayer(layerName)
      for (const object of layer?.objects ?? []) {
        const id = tiledProperty(object, 'id')
        if (typeof id !== 'string') continue
        overrides.set(`${layerName}:${id}`, {
          x: object.x ?? 0,
          y: object.y ?? 0,
          w: object.width ?? 0,
          h: object.height ?? 0,
        })
      }
    }
    return overrides
  }

  private createGates() {
    const overrides = this.gateOverrides()
    const add = (kind: GateEntity['kind'], original: DoorConfig | ExitConfig) => {
      const override = overrides.get(`${kind === 'door' ? 'doors' : 'exits'}:${original.id}`)
      const config = override ? { ...original, ...override } : original
      const padding = kind === 'door' ? DOOR_INTERACTION_PADDING : 0
      const area = this.add.zone(
        config.x + config.w / 2,
        config.y + config.h / 2,
        config.w + padding * 2,
        config.h + padding * 2,
      )
      this.physics.add.existing(area, true)
      this.gates.push({ kind, config, area, armed: false })
    }
    for (const door of this.zone.doors) add('door', door)
    for (const exit of this.zone.exits) add('exit', exit)
  }

  private createDaylight() {
    const camera = this.cameras.main
    this.daylightTint = daylightForClock(useGameStore.getState().gameClock)
    // scrollFactor 0 + zoom масштабують прямокутник навколо центру камери, тож він гарантовано вкриває екран.
    this.daylight = this.add
      .rectangle(0, 0, camera.width, camera.height, this.daylightTint.color, this.daylightTint.alpha)
      .setOrigin(0)
      .setScrollFactor(0)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setDepth(DAYLIGHT_DEPTH)
  }

  private fadeDaylightTo(clock: string) {
    const from = { ...this.daylightTint }
    const to = daylightForClock(clock)
    this.daylightTween?.stop()
    const progress = { t: 0 }
    this.daylightTween = this.tweens.add({
      targets: progress,
      t: 1,
      duration: DAYLIGHT_TRANSITION,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        this.daylightTint = mixTint(from, to, progress.t)
        this.daylight.setFillStyle(this.daylightTint.color, this.daylightTint.alpha)
      },
    })
  }

  private setupCamera() {
    const camera = this.cameras.main
    camera.setBackgroundColor(this.backgroundColor)
    camera.setZoom(CAMERA_ZOOM)
    camera.setRoundPixels(true)
    const viewWidth = camera.width / CAMERA_ZOOM
    const viewHeight = camera.height / CAMERA_ZOOM
    if (this.map.widthInPixels <= viewWidth && this.map.heightInPixels <= viewHeight) {
      camera.stopFollow()
      camera.removeBounds()
      camera.centerOn(this.map.widthInPixels / 2, this.map.heightInPixels / 2)
      return
    }
    camera.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels)
    camera.startFollow(this.player, true)
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.cameras.main.setSize(gameSize.width, gameSize.height)
    this.daylight.setSize(gameSize.width, gameSize.height)
    this.setupCamera()
  }

  private openEnterDialogue() {
    const dialogueId = this.zone.onEnterDialogue
    if (!dialogueId) return
    const flagName = `entered_${this.zone.id}`
    if (useGameStore.getState().flags[flagName] === true) return

    this.time.delayedCall(ON_ENTER_DIALOGUE_DELAY, () => {
      const store = useGameStore.getState()
      store.setFlag(flagName, true)
      store.setActiveDialogue(dialogueId)
    })
  }

  private isInputBlocked() {
    const { activeDialogue, activeExercise } = useGameStore.getState()
    return activeDialogue !== null || activeExercise !== null
  }

  private isOpen(gate: GateEntity) {
    return isGateOpen(gate.config, useGameStore.getState().flags)
  }

  private isPlayerIn(gate: GateEntity) {
    return this.physics.overlap(this.player, gate.area)
  }

  private updateNpcs(delta: number) {
    for (const entity of this.npcEntities) {
      const { sprite } = entity
      if (entity.config.patrol) {
        sprite.x += entity.direction * NPC_PATROL_SPEED * (delta / 1000)
        if (sprite.x >= entity.originX + NPC_PATROL_RANGE) {
          sprite.x = entity.originX + NPC_PATROL_RANGE
          entity.direction = -1
        } else if (sprite.x <= entity.originX - NPC_PATROL_RANGE) {
          sprite.x = entity.originX - NPC_PATROL_RANGE
          entity.direction = 1
        }
        if (entity.animated && entity.config.sprite) {
          const key = lpcTextureKey(entity.config.sprite)
          sprite.play(
            lpcAnimationKey(key, 'walk', entity.direction < 0 ? 'left' : 'right'),
            true,
          )
        }
      }
      sprite.setDepth(bottomOf(sprite))
      entity.greetingText.setPosition(sprite.x, this.greetingY(sprite))
    }
  }

  private scheduleNpcGreeting(entity: NpcEntity) {
    const delay = Phaser.Math.Between(
      NPC_GREETING_MIN_DELAY,
      NPC_GREETING_MAX_DELAY,
    )
    this.time.delayedCall(delay, () => {
      this.tweens.add({
        targets: entity.greetingText,
        alpha: 1,
        duration: 200,
        yoyo: true,
        hold: 1400,
        ease: 'Sine.easeInOut',
      })
      this.scheduleNpcGreeting(entity)
    })
  }

  private updateHint() {
    let closestNpc: CityNpcConfig | null = null
    let closestDistance = Infinity

    for (const entity of this.npcEntities) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        bottomOf(this.player),
        entity.sprite.x,
        bottomOf(entity.sprite),
      )
      if (distance <= NPC_INTERACTION_RADIUS && distance < closestDistance) {
        closestDistance = distance
        closestNpc = entity.config
      }
    }

    if (closestNpc) {
      this.setHint({ kind: 'npc', npc: closestNpc })
      return
    }

    // Закриті двері не показуються в підказці.
    const door = this.gates.find(
      (gate) =>
        gate.kind === 'door' && this.isOpen(gate) && this.isPlayerIn(gate),
    )
    this.setHint(door ? { kind: 'door', gate: door } : null)
  }

  private setHint(target: HintTarget | null) {
    const key = !target
      ? null
      : target.kind === 'npc'
        ? `npc:${target.npc.id}`
        : `door:${target.gate.config.id}`
    if (key === this.hintKey) return
    this.hintKey = key
    this.hintTarget = target

    let hint: InteractionHint | null = null
    if (target?.kind === 'npc') {
      hint = { kind: 'npc', id: target.npc.id, label: target.npc.name }
    } else if (target?.kind === 'door') {
      hint = {
        kind: 'door',
        id: target.gate.config.id,
        label: this.zoneLabel(target.gate.config.target),
      }
    }
    useGameStore.getState().setInteractionHint(hint)
  }

  private zoneLabel(zoneId: string) {
    return {
      en: i18next.t(`zones.${zoneId}`, { lng: 'en' }),
      uk: i18next.t(`zones.${zoneId}`, { lng: 'uk' }),
    }
  }

  private checkExits() {
    for (const gate of this.gates) {
      if (gate.kind !== 'exit') continue
      const inside = this.isPlayerIn(gate)
      if (!inside) {
        gate.armed = true
      } else if (gate.armed && this.isOpen(gate)) {
        this.transitionThrough(gate)
        return
      }
    }
  }

  private interact() {
    if (this.transitioning || this.isInputBlocked() || !this.hintTarget) return
    if (this.hintTarget.kind === 'npc') {
      this.saveSpawn()
      useGameStore.getState().setActiveDialogue(this.hintTarget.npc.dialogueId)
      return
    }
    if (this.isOpen(this.hintTarget.gate)) {
      this.transitionThrough(this.hintTarget.gate)
    }
  }

  private transitionThrough(gate: GateEntity) {
    this.transitioning = true
    this.player.setVelocity(0)
    this.setHint(null)

    const { target, spawn } = gate.config
    this.cameras.main.fadeOut(FADE_DURATION)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const city = useGameStore.getState().cityConfig!
      const targetZone = getZone(city, target)
      useGameStore.setState({ currentZone: target, spawn })
      const data: ZoneSceneData = { zoneId: target }
      this.scene.start(sceneKeyForZone(targetZone), data)
    })
  }

  private saveSpawn() {
    // Під час переходу spawn уже вказує на точку в новій зоні — не перезаписуємо його.
    if (this.transitioning || !this.player?.active) return
    const spawn = {
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
    }
    if (
      this.lastSavedSpawn?.x === spawn.x &&
      this.lastSavedSpawn?.y === spawn.y
    ) {
      return
    }
    this.lastSavedSpawn = spawn
    useGameStore.getState().setSpawn(spawn)
  }

  private questArrowWorldPoint(): { x: number; y: number } | null {
    const state = useGameStore.getState()
    if (!state.cityConfig || !state.questline) return null
    const target = getArrowTarget(state.cityConfig, state.questline, state)
    if (!target) return null

    if (target.kind === 'npc') {
      const entity = this.npcEntities.find((npc) => npc.config.id === target.id)
      return entity
        ? { x: entity.sprite.x, y: entity.sprite.y - entity.sprite.displayHeight / 2 }
        : null
    }
    const gate = this.gates.find(
      (candidate) =>
        candidate.kind === target.kind && candidate.config.id === target.id,
    )
    return gate ? { x: gate.area.x, y: gate.area.y } : null
  }

  // Стрілка малюється у світових координатах: з zoom об'єкти зі scrollFactor 0 зміщуються від центру.
  private drawQuestArrow() {
    this.arrow.clear()
    const point = this.questArrowWorldPoint()
    if (!point) return

    const camera = this.cameras.main
    const view = camera.worldView
    const inset = ARROW_EDGE_INSET / camera.zoom
    const topInset = ARROW_TOP_INSET / camera.zoom
    const size = ARROW_SIZE / camera.zoom
    const onScreen =
      point.x >= view.x + inset &&
      point.x <= view.right - inset &&
      point.y >= view.y + topInset &&
      point.y <= view.bottom - inset

    let x: number
    let y: number
    let angle: number
    if (onScreen) {
      // Ціль видно: трикутник над нею, вістрям донизу, з легким погойдуванням.
      x = point.x
      y = point.y - size * 1.5 + Math.sin(this.time.now / 200) * 2
      angle = Math.PI / 2
    } else {
      // Ціль за кадром: трикутник біля краю екрана в її напрямку.
      const dx = point.x - view.centerX
      const dy = point.y - view.centerY
      angle = Math.atan2(dy, dx)
      const verticalInset = dy < 0 ? topInset : inset
      const scale = Math.min(
        (view.width / 2 - inset) / Math.max(Math.abs(dx), 1),
        (view.height / 2 - verticalInset) / Math.max(Math.abs(dy), 1),
      )
      x = view.centerX + dx * scale
      y = view.centerY + dy * scale
    }

    const corner = (offset: number) => ({
      x: x + Math.cos(angle + offset) * size,
      y: y + Math.sin(angle + offset) * size,
    })
    const tip = corner(0)
    const leftCorner = corner((Math.PI * 3) / 4)
    const rightCorner = corner((-Math.PI * 3) / 4)
    this.arrow.fillStyle(ARROW_COLOR, 1)
    this.arrow.lineStyle(2 / camera.zoom, 0x111111, 1)
    this.arrow.fillTriangle(tip.x, tip.y, leftCorner.x, leftCorner.y, rightCorner.x, rightCorner.y)
    this.arrow.strokeTriangle(tip.x, tip.y, leftCorner.x, leftCorner.y, rightCorner.x, rightCorner.y)
  }
}
