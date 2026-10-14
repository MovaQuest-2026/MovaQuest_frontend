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
import { getArrowTarget, isGateOpen } from '../quests/questEngine'
import { sceneKeyForZone, type ZoneSceneData } from './sceneKeys'

const TILE_SIZE = 32
const MOVE_SPEED = 200
const TILESET_KEY = 'tileset'
const TILESET_IMAGE_KEY = 'tileset'
const PLAYER_TEXTURE = 'player-placeholder'
const NPC_TEXTURE = 'npc-placeholder'
const NPC_INTERACTION_RADIUS = 48
const NPC_PATROL_SPEED = 40
const NPC_PATROL_RANGE = 48
const NPC_GREETING_MIN_DELAY = 3000
const NPC_GREETING_MAX_DELAY = 6000
const DOOR_INTERACTION_PADDING = 16
const SPAWN_SAVE_INTERVAL = 500
const FADE_DURATION = 250
const ON_ENTER_DIALOGUE_DELAY = 300
const ARROW_EDGE_INSET = 40
const ARROW_SIZE = 14
const ARROW_COLOR = 0xffd23f

interface NpcEntity {
  config: CityNpcConfig
  sprite: Phaser.GameObjects.Image
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

/**
 * Спільна основа сцен зон: тайлмапа, гравець, колізії, NPC, двері й виходи,
 * підказка взаємодії, стрілка квесту і переходи між зонами.
 */
export abstract class ZoneSceneBase extends Phaser.Scene {
  protected zone!: ZoneConfig
  private player!: Phaser.Physics.Arcade.Image
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: {
    up: Phaser.Input.Keyboard.Key
    down: Phaser.Input.Keyboard.Key
    left: Phaser.Input.Keyboard.Key
    right: Phaser.Input.Keyboard.Key
  }
  private arrow!: Phaser.GameObjects.Graphics
  private npcEntities: NpcEntity[] = []
  private gates: GateEntity[] = []
  private hintTarget: HintTarget | null = null
  private hintKey: string | null = null
  private lastSavedSpawn: { x: number; y: number } | null = null
  private transitioning = false

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
  }

  preload() {
    this.load.tilemapTiledJSON(
      this.tilemapKey(),
      `/tilemaps/${this.zone.tilemap}.json`,
    )
    this.load.image(TILESET_IMAGE_KEY, '/tilemaps/tileset.png')
    this.ensurePlaceholderTexture(PLAYER_TEXTURE, 0xff5a5f)
    this.ensurePlaceholderTexture(NPC_TEXTURE, 0xffd23f)
  }

  create() {
    const map = this.make.tilemap({ key: this.tilemapKey() })
    const tileset = map.addTilesetImage(TILESET_KEY, TILESET_IMAGE_KEY)!
    const groundLayer = map.createLayer('ground', tileset, 0, 0)!
    const collisionLayer = map.createLayer('collision', tileset, 0, 0)!
    collisionLayer.setCollisionByProperty({ collides: true })
    groundLayer.setDepth(0)
    collisionLayer.setDepth(1)

    const start = this.clampToMap(
      useGameStore.getState().spawn ?? this.zone.spawn,
      map,
    )
    this.player = this.physics.add.image(start.x, start.y, PLAYER_TEXTURE)
    this.player.setCollideWorldBounds(true).setDepth(2)
    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    this.physics.add.collider(this.player, collisionLayer)

    this.setupCamera(map)
    this.createNpcs()
    this.createGates()

    this.arrow = this.add.graphics().setScrollFactor(0).setDepth(10)

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
    })

    this.time.addEvent({
      delay: SPAWN_SAVE_INTERVAL,
      loop: true,
      callback: () => this.saveSpawn(),
    })

    const handleExit = () => {
      unsubscribe()
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
    this.updateNpcPatrol(delta)
    this.drawQuestArrow()

    if (this.transitioning) return
    if (this.isInputBlocked()) {
      this.setHint(null)
      return
    }

    const left = this.cursors.left.isDown || this.wasd.left.isDown
    const right = this.cursors.right.isDown || this.wasd.right.isDown
    const up = this.cursors.up.isDown || this.wasd.up.isDown
    const down = this.cursors.down.isDown || this.wasd.down.isDown

    if (left) this.player.setVelocityX(-MOVE_SPEED)
    else if (right) this.player.setVelocityX(MOVE_SPEED)

    if (up) this.player.setVelocityY(-MOVE_SPEED)
    else if (down) this.player.setVelocityY(MOVE_SPEED)

    this.updateHint()
    this.checkExits()
  }

  private tilemapKey() {
    return `tilemap_${this.zone.tilemap}`
  }

  private ensurePlaceholderTexture(key: string, color: number) {
    if (this.textures.exists(key)) return
    const graphics = this.make.graphics({ x: 0, y: 0 })
    graphics.fillStyle(color, 1)
    graphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE)
    graphics.generateTexture(key, TILE_SIZE, TILE_SIZE)
    graphics.destroy()
  }

  private clampToMap(point: { x: number; y: number }, map: Phaser.Tilemaps.Tilemap) {
    // Позиція зі старого збереження може бути поза меншою мапою — тримаємо гравця всередині стін.
    const min = TILE_SIZE * 1.5
    return {
      x: Phaser.Math.Clamp(point.x, min, map.widthInPixels - min),
      y: Phaser.Math.Clamp(point.y, min, map.heightInPixels - min),
    }
  }

  private setupCamera(map: Phaser.Tilemaps.Tilemap) {
    const camera = this.cameras.main
    camera.setBackgroundColor(this.backgroundColor)
    if (
      map.widthInPixels <= camera.width &&
      map.heightInPixels <= camera.height
    ) {
      camera.centerOn(map.widthInPixels / 2, map.heightInPixels / 2)
      return
    }
    camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    camera.startFollow(this.player)
  }

  private createNpcs() {
    const greeting = i18next.t('world.npcGreeting')
    for (const npc of this.zone.npcs) {
      const sprite = this.add.image(npc.x, npc.y, NPC_TEXTURE).setDepth(2)
      const greetingText = this.add
        .text(npc.x, npc.y - 28, greeting, {
          fontFamily: 'sans-serif',
          fontSize: '14px',
          color: '#111111',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: { x: 6, y: 3 },
        })
        .setOrigin(0.5)
        .setAlpha(0)
        .setDepth(3)

      const entity: NpcEntity = {
        config: npc,
        sprite,
        greetingText,
        originX: npc.x,
        direction: Math.random() < 0.5 ? 1 : -1,
      }
      this.npcEntities.push(entity)
      this.scheduleNpcGreeting(entity)
    }
  }

  private createGates() {
    const add = (kind: GateEntity['kind'], config: DoorConfig | ExitConfig) => {
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

  private updateNpcPatrol(delta: number) {
    for (const entity of this.npcEntities) {
      if (!entity.config.patrol) continue
      entity.sprite.x += entity.direction * NPC_PATROL_SPEED * (delta / 1000)

      if (entity.sprite.x >= entity.originX + NPC_PATROL_RANGE) {
        entity.sprite.x = entity.originX + NPC_PATROL_RANGE
        entity.direction = -1
      } else if (entity.sprite.x <= entity.originX - NPC_PATROL_RANGE) {
        entity.sprite.x = entity.originX - NPC_PATROL_RANGE
        entity.direction = 1
      }

      entity.greetingText.setPosition(entity.sprite.x, entity.sprite.y - 28)
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
        this.player.y,
        entity.sprite.x,
        entity.sprite.y,
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
      return entity ? { x: entity.sprite.x, y: entity.sprite.y } : null
    }
    const gate = this.gates.find(
      (candidate) =>
        candidate.kind === target.kind && candidate.config.id === target.id,
    )
    return gate ? { x: gate.area.x, y: gate.area.y } : null
  }

  private drawQuestArrow() {
    this.arrow.clear()
    const point = this.questArrowWorldPoint()
    if (!point) return

    const camera = this.cameras.main
    const screenX = point.x - camera.worldView.x
    const screenY = point.y - camera.worldView.y
    const onScreen =
      screenX >= ARROW_EDGE_INSET &&
      screenX <= camera.width - ARROW_EDGE_INSET &&
      screenY >= ARROW_EDGE_INSET &&
      screenY <= camera.height - ARROW_EDGE_INSET

    let x: number
    let y: number
    let angle: number
    if (onScreen) {
      // Ціль видно: трикутник над нею, вістрям донизу, з легким погойдуванням.
      x = screenX
      y = screenY - 36 + Math.sin(this.time.now / 200) * 4
      angle = Math.PI / 2
    } else {
      // Ціль за кадром: трикутник біля краю екрана в її напрямку.
      const centerX = camera.width / 2
      const centerY = camera.height / 2
      const dx = screenX - centerX
      const dy = screenY - centerY
      angle = Math.atan2(dy, dx)
      const scale = Math.min(
        (centerX - ARROW_EDGE_INSET) / Math.max(Math.abs(dx), 1),
        (centerY - ARROW_EDGE_INSET) / Math.max(Math.abs(dy), 1),
      )
      x = centerX + dx * scale
      y = centerY + dy * scale
    }

    const corner = (offset: number) => ({
      x: x + Math.cos(angle + offset) * ARROW_SIZE,
      y: y + Math.sin(angle + offset) * ARROW_SIZE,
    })
    const tip = corner(0)
    const leftCorner = corner((Math.PI * 3) / 4)
    const rightCorner = corner((-Math.PI * 3) / 4)
    this.arrow.fillStyle(ARROW_COLOR, 1)
    this.arrow.lineStyle(2, 0x111111, 1)
    this.arrow.fillTriangle(
      tip.x,
      tip.y,
      leftCorner.x,
      leftCorner.y,
      rightCorner.x,
      rightCorner.y,
    )
    this.arrow.strokeTriangle(
      tip.x,
      tip.y,
      leftCorner.x,
      leftCorner.y,
      rightCorner.x,
      rightCorner.y,
    )
  }
}
