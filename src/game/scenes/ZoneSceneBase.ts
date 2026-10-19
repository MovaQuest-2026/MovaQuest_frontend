import Phaser from 'phaser'
import i18next from 'i18next'
import {
  getZone,
  type BackgroundConfig,
  type CityNpcConfig,
  type DoorConfig,
  type ExitConfig,
  type TriggerConfig,
  type ZoneConfig,
} from '../../api/getCityConfig'
import {
  useGameStore,
  type ExitDecisionEvent,
  type InteractionHint,
} from '../../store/useGameStore'
import { daylightForClock, mixTint, type DaylightTint } from '../daylight'
import {
  createLpcAnimations,
  lpcAnimationKey,
  lpcTextureKey,
  LPC_FRAME_SIZE,
  type Direction,
} from '../lpc'
import { getArrowTarget, isGateOpen } from '../quests/questEngine'
import { isRainActive } from '../weather'
import { sceneKeyForZone, type ZoneSceneData } from './sceneKeys'

const CAMERA_ZOOM = 2
const MOVE_SPEED = 120
// Відхилення джойстика, менше за це, вважаємо нулем.
const JOYSTICK_DEADZONE = 0.15
const PLAYER_CHARACTER_ID = 'player'
const PLAYER_PLACEHOLDER_TEXTURE = 'player-placeholder'
const NPC_PLACEHOLDER_TEXTURE = 'npc-placeholder'
const PLACEHOLDER_SIZE = 32
// Хітбокс біля ніг, щоб ходити повз стіни і в дверні прорізи.
const FEET_BODY_WIDTH = 20
const FEET_BODY_HEIGHT = 14
// Хітбокс статичного спрайта: 10×6 біля ніг.
const STATIC_BODY_WIDTH = 10
const STATIC_BODY_HEIGHT = 6
// Погойдування статичного спрайта в русі: 2 px вгору-вниз кожні 120 мс.
const BOB_INTERVAL = 120
const BOB_HEIGHT = 2
// Наскільки відсуваємо гравця від виходу після «Ще ні».
const EXIT_CANCEL_PUSHBACK = 12
// Відступ від краю світу, що задається background (у тайлових зонах — півтора тайла).
const BACKGROUND_EDGE_MARGIN = 4
const NPC_INTERACTION_RADIUS = 40
const NPC_PATROL_SPEED = 30
const NPC_PATROL_RANGE = 48
const NPC_GREETING_MIN_DELAY = 3000
const NPC_GREETING_MAX_DELAY = 6000
const DOOR_INTERACTION_PADDING = 12
// Наскільки близько до закритого виходу показувати пояснення lockedHint.
const LOCKED_HINT_PADDING = 24
const SPAWN_SAVE_INTERVAL = 500
const FADE_DURATION = 250
const ON_ENTER_DIALOGUE_DELAY = 300
const DAYLIGHT_TRANSITION = 1500
const RAIN_TEXTURE = 'raindrop'
const RAIN_TINT: DaylightTint = { color: 0x5d6b80, alpha: 0.5 }
const RAIN_TINT_STRENGTH = 0.75
const NPC_HIDE_SPEED = 60
const ROUTE_COLOR = 0xffd23f
const ROUTE_DASH = 6
const ROUTE_GAP = 4
const ARROW_EDGE_INSET = 40
// Зверху більший відступ, щоб стрілка не ховалася під QuestTracker.
const ARROW_TOP_INSET = 110
const ARROW_SIZE = 14
const ARROW_COLOR = 0xffd23f
// Тайлові шари нижче за всіх, спрайти сортуються за y, далі — підписи, тінт доби і стрілка.
const TILE_LAYER_DEPTH = -1000
const ROUTE_DEPTH = -100
const GREETING_DEPTH = 100000
const RAIN_DEPTH = 150000
const DAYLIGHT_DEPTH = 200000
// Підсвічені струмені фонтану світяться поверх сутінків.
const FOUNTAIN_JETS_DEPTH = 250000
const ARROW_DEPTH = 300000

const FOUNTAIN_LANDMARK_ID = 'roshen_fountain'
const FOUNTAIN_CUTSCENE_ID = 'fountain'
const FOUNTAIN_AUDIO_KEY = 'audio:fountain'
const FOUNTAIN_AUDIO_URL = '/audio/fountain.mp3'
const WATER_TEXTURE = 'water-drop'
const CUTSCENE_DURATION = 8000
const CUTSCENE_PAN_DURATION = 1800
const CUTSCENE_JETS_DELAY = 1200
const CUTSCENE_FADE_OUT = 600
const JET_OFFSETS = [-24, -12, 0, 12, 24]
const JET_GRAVITY = 300
const DUSK_TINT: DaylightTint = { color: 0x3d3a8c, alpha: 0.6 }
// Кольори плейсхолдерів за одягом, щоб натовп і Соломію можна було розрізнити без LPC-спрайтів.
const OUTFIT_COLORS: [string, number][] = [
  ['red', 0xd94848],
  ['blue', 0x4a68d9],
  ['yellow', 0xe8c840],
  ['green', 0x3f9a5c],
]

// Асети, яких немає на сервері, не пробуємо вантажити знову при кожному вході в зону.
const missingTextures = new Set<string>()
const missingAudio = new Set<string>()

// LPC-вигляд NPC: outfit має пріоритет над sprite. Статичний character перевіряється окремо і стоїть вище.
function characterIdOf(npc: CityNpcConfig) {
  return npc.outfit ?? npc.sprite ?? null
}

function staticTextureKey(id: string) {
  return `char:${id}`
}

function backgroundTextureKey(image: string) {
  return `background:${image}`
}

interface NpcEntity {
  config: CityNpcConfig
  sprite: Phaser.GameObjects.Sprite
  animated: boolean
  // Статичний кадр (character або invisible): origin (0.5, 1), depth = y, без LPC-анімацій.
  isStatic: boolean
  // Ключ LPC-текстури, якщо спрайт анімований.
  lpcKey: string | null
  greetingText: Phaser.GameObjects.Text
  originX: number
  direction: 1 | -1
  // Під час зливи NPC з patrol: true ідуть до найближчих дверей (hiding) і зникають (hidden).
  hiding: boolean
  hidden: boolean
}

interface GateEntity {
  kind: 'door' | 'exit'
  config: DoorConfig | ExitConfig
  area: Phaser.GameObjects.Zone
  // Вихід спрацьовує тільки після того, як гравець хоч раз був поза ним — щоб не вилетіти одразу після спавну.
  armed: boolean
  // Остання позиція гравця поза виходом: туди його відсуваємо після «Ще ні».
  lastOutside: { x: number; y: number } | null
}

interface TriggerEntity {
  config: TriggerConfig
  area: Phaser.GameObjects.Zone
}

type HintTarget =
  | { kind: 'npc'; npc: CityNpcConfig }
  | { kind: 'door'; gate: GateEntity }
  | { kind: 'locked'; gate: GateEntity }

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
  // Є тільки в зон з tilemap; зони з background його не мають.
  protected map!: Phaser.Tilemaps.Tilemap
  private worldWidth = 0
  private worldHeight = 0
  private zoom = CAMERA_ZOOM
  private player!: Phaser.Physics.Arcade.Sprite
  private playerAnimated = false
  private playerStatic = false
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
  private rain!: Phaser.GameObjects.Particles.ParticleEmitter
  private rainArea = new Phaser.Geom.Rectangle()
  private raining = false
  private route!: Phaser.GameObjects.Graphics
  private cutsceneRunning = false
  private fountainSound: Phaser.Sound.BaseSound | null = null
  private npcEntities: NpcEntity[] = []
  private gates: GateEntity[] = []
  private triggers: TriggerEntity[] = []
  private hintTarget: HintTarget | null = null
  private hintKey: string | null = null
  private lastSavedSpawn: { x: number; y: number } | null = null
  private transitioning = false
  private requestedTextures: string[] = []

  protected abstract readonly backgroundColor: string

  /** Додаткові об'єкти конкретної сцени (наприклад, вікна тролейбуса). */
  protected createZoneExtras() {}

  /** Покадрове оновлення додаткових об'єктів конкретної сцени. */
  protected updateZoneExtras(_delta: number) {}

  init(data: ZoneSceneData) {
    const city = useGameStore.getState().cityConfig
    if (!city) throw new Error('City config is not loaded')
    this.zone = getZone(city, data.zoneId)
    this.npcEntities = []
    this.gates = []
    this.triggers = []
    this.hintTarget = null
    this.hintKey = null
    this.lastSavedSpawn = null
    this.transitioning = false
    this.playerAnimated = false
    this.playerStatic = false
    this.worldWidth = 0
    this.worldHeight = 0
    this.zoom = CAMERA_ZOOM
    this.facing = 'down'
    this.daylightTween = null
    this.requestedTextures = []
    this.raining = false
    this.cutsceneRunning = false
    this.fountainSound = null
  }

  preload() {
    const { background } = this.zone
    if (background) {
      this.loadImageOnce(
        backgroundTextureKey(background.image),
        `/assets/backgrounds/${background.image}.png`,
      )
    } else {
      this.preloadTilemap()
    }

    const playerCharacter = useGameStore.getState().cityConfig?.playerCharacter
    if (playerCharacter) {
      this.loadImageOnce(staticTextureKey(playerCharacter), `/assets/characters/${playerCharacter}.png`)
    }
    const lpcIds = [
      ...(playerCharacter ? [] : [PLAYER_CHARACTER_ID]),
      ...this.zone.npcs.flatMap((npc) => {
        if (npc.character) {
          this.loadImageOnce(staticTextureKey(npc.character), `/assets/characters/${npc.character}.png`)
        }
        const id = characterIdOf(npc)
        return id && !npc.invisible ? [id] : []
      }),
    ]
    for (const id of new Set(lpcIds)) {
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

  private preloadTilemap() {
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
  }

  create() {
    for (const key of this.requestedTextures) {
      if (!this.textures.exists(key)) missingTextures.add(key)
    }


    this.zoom = this.computeZoom()
    const layers = this.zone.background
      ? this.createBackground(this.zone.background)
      : this.createTilemapLayers()

    this.createPlayer()
    this.physics.world.setBounds(0, 0, this.worldWidth, this.worldHeight)
    for (const layer of layers) this.physics.add.collider(this.player, layer)
    this.createColliders()

    this.createLandmarks()
    this.createNpcs()
    this.createGates()
    this.createTriggers()

    this.raining = this.isRainingHere()
    if (this.raining) this.hidePatrolNpcs(false)

    this.arrow = this.add.graphics().setDepth(ARROW_DEPTH)
    this.route = this.add.graphics().setDepth(ROUTE_DEPTH)
    this.createDaylight()
    this.createRain()
    this.setupCamera()
    this.createZoneExtras()

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

    this.applyPhysicsDebug()

    const unsubscribe = useGameStore.subscribe((state, prev) => {
      if (state.interactRequest !== prev.interactRequest) this.interact()
      if (state.gameClock !== prev.gameClock) this.fadeDaylight()
      if (state.flags !== prev.flags) this.updateWeather()
      if (state.activeDialogue !== prev.activeDialogue) this.drawNpcRoute()
      if (state.pendingCutscene !== prev.pendingCutscene) this.maybeStartCutscene()
      if (state.zoneRequest && state.zoneRequest !== prev.zoneRequest) {
        this.handleZoneRequest(state.zoneRequest.zoneId)
      }
      if (state.lastExitDecision && state.lastExitDecision !== prev.lastExitDecision) {
        this.handleExitDecision(state.lastExitDecision)
      }
      if (state.debugPhysics !== prev.debugPhysics) this.applyPhysicsDebug()
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
    this.maybeStartCutscene()
  }

  update(_time: number, delta: number) {
    this.player.setVelocity(0)
    this.updateNpcs(delta)
    this.updateZoneExtras(delta)

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

    // Клавіатура має пріоритет; без натиснутих клавіш рухаємося за віртуальним джойстиком.
    let inputX = left ? -1 : right ? 1 : 0
    let inputY = up ? -1 : down ? 1 : 0
    if (inputX === 0 && inputY === 0) {
      const { joystick } = useGameStore.getState()
      if (Math.hypot(joystick.x, joystick.y) > JOYSTICK_DEADZONE) {
        inputX = joystick.x
        inputY = joystick.y
      }
    }
    const velocityX = inputX * MOVE_SPEED
    const velocityY = inputY * MOVE_SPEED
    this.player.setVelocity(velocityX, velocityY)
    this.animatePlayer(velocityX, velocityY)
    this.player.setDepth(this.playerStatic ? this.player.y : bottomOf(this.player))

    this.updateHint()
    this.checkTriggers()
    this.checkExits()
    this.drawQuestArrow()
  }

  private tilemapKey() {
    return `tilemap_${this.zone.tilemap}`
  }

  private createTilemapLayers() {
    this.map = this.make.tilemap({ key: this.tilemapKey() })
    this.worldWidth = this.map.widthInPixels
    this.worldHeight = this.map.heightInPixels
    const tilesets = this.map.tilesets.flatMap((tileset) => {
      const added = this.map.addTilesetImage(
        tileset.name,
        tilesetTextureKey(tileset.name),
      )
      return added ? [added] : []
    })
    return this.map.layers.flatMap((layerData, index) => {
      const layer = this.map.createLayer(layerData.name, tilesets, 0, 0)
      if (!layer) return []
      layer.setCollisionByProperty({ collides: true })
      layer.setDepth(TILE_LAYER_DEPTH + index)
      return [layer]
    })
  }

  // Готова картинка замість тайлмапи: у нативному розмірі, origin (0, 0), під усіма спрайтами.
  private createBackground(background: BackgroundConfig) {
    this.worldWidth = background.width
    this.worldHeight = background.height
    const key = backgroundTextureKey(background.image)
    if (this.textures.exists(key)) {
      this.add.image(0, 0, key).setOrigin(0, 0).setDepth(TILE_LAYER_DEPTH)
    } else if (background.fillColor) {
      // Без картинки світ лишається прохідним: заливаємо його кольором фону.
      const color = Phaser.Display.Color.HexStringToColor(background.fillColor).color
      this.add
        .rectangle(0, 0, background.width, background.height, color)
        .setOrigin(0, 0)
        .setDepth(TILE_LAYER_DEPTH)
    }
    return []
  }

  // Невидимі статичні прямокутники з colliders зони.
  private createColliders() {
    for (const collider of this.zone.colliders ?? []) {
      const block = this.add.zone(
        collider.x + collider.w / 2,
        collider.y + collider.h / 2,
        collider.w,
        collider.h,
      )
      this.physics.add.existing(block, true)
      this.physics.add.collider(this.player, block)
    }
  }

  // Зона з background: цілий zoom, щоб піксель-арт не розмивався; на великому екрані картинка заповнює його.
  private computeZoom() {
    const { background } = this.zone
    if (!background) return CAMERA_ZOOM
    const { width, height } = this.cameras.main
    const fit = Math.min(width / background.width, height / background.height)
    return Math.max(CAMERA_ZOOM, Math.ceil(fit))
  }

  // Перемикач з DebugPanel для підгонки colliders.
  private applyPhysicsDebug() {
    const world = this.physics.world
    if (useGameStore.getState().debugPhysics) {
      if (!world.debugGraphic) world.createDebugGraphic()
      world.drawDebug = true
      world.debugGraphic.setVisible(true)
    } else {
      world.drawDebug = false
      world.debugGraphic?.clear().setVisible(false)
    }
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
    const minX = this.map ? this.map.tileWidth * 1.5 : BACKGROUND_EDGE_MARGIN
    const minY = this.map ? this.map.tileHeight * 1.5 : BACKGROUND_EDGE_MARGIN
    return {
      x: Phaser.Math.Clamp(point.x, minX, this.worldWidth - minX),
      y: Phaser.Math.Clamp(point.y, minY, this.worldHeight - minY),
    }
  }

  private createPlayer() {
    const start = this.clampToMap(useGameStore.getState().spawn ?? this.zone.spawn)
    const playerCharacter = useGameStore.getState().cityConfig?.playerCharacter
    const staticKey = playerCharacter ? staticTextureKey(playerCharacter) : null
    const lpcKey = lpcTextureKey(PLAYER_CHARACTER_ID)
    this.playerStatic = staticKey !== null && this.textures.exists(staticKey)
    this.playerAnimated = !playerCharacter && this.textures.exists(lpcKey)

    if (this.playerStatic) {
      this.player = this.physics.add.sprite(start.x, start.y, staticKey!).setOrigin(0.5, 1)
    } else if (this.playerAnimated) {
      createLpcAnimations(this, lpcKey)
      this.player = this.physics.add.sprite(start.x, start.y, lpcKey)
      this.player.play(lpcAnimationKey(lpcKey, 'idle', this.facing))
    } else {
      this.player = this.physics.add.sprite(start.x, start.y, PLAYER_PLACEHOLDER_TEXTURE)
    }

    const frameWidth = this.player.width
    const frameHeight = this.player.height
    const body = this.player.body as Phaser.Physics.Arcade.Body
    if (this.playerStatic) {
      body.setSize(STATIC_BODY_WIDTH, STATIC_BODY_HEIGHT)
      body.setOffset((frameWidth - STATIC_BODY_WIDTH) / 2, frameHeight - STATIC_BODY_HEIGHT)
    } else {
      body.setSize(FEET_BODY_WIDTH, FEET_BODY_HEIGHT)
      // LPC-персонаж стоїть на ~2 px вище низу кадру.
      const feetGap = this.playerAnimated ? 2 : 0
      body.setOffset(
        (frameWidth - FEET_BODY_WIDTH) / 2,
        frameHeight - FEET_BODY_HEIGHT - feetGap,
      )
    }
    this.player.setCollideWorldBounds(true)
    this.player.setDepth(this.playerStatic ? this.player.y : bottomOf(this.player))
  }

  // Статичний спрайт: flipX за горизонтальним напрямком і погойдування на 2 px, поки рухається.
  private animateStatic(sprite: Phaser.GameObjects.Sprite, velocityX: number, moving: boolean) {
    if (velocityX !== 0) sprite.setFlipX(velocityX < 0)
    const raised = moving && Math.floor(this.time.now / BOB_INTERVAL) % 2 === 1
    sprite.setOrigin(0.5, raised ? 1 + BOB_HEIGHT / sprite.height : 1)
  }

  private animatePlayer(velocityX: number, velocityY: number) {
    if (this.playerStatic) {
      this.animateStatic(this.player, velocityX, velocityX !== 0 || velocityY !== 0)
      return
    }
    if (!this.playerAnimated) return
    const key = lpcTextureKey(PLAYER_CHARACTER_ID)
    if (velocityX === 0 && velocityY === 0) {
      this.player.play(lpcAnimationKey(key, 'idle', this.facing), true)
      return
    }
    // Напрямок за домінантною віссю; при рівних (клавіші по діагоналі) — горизонталь.
    if (Math.abs(velocityX) >= Math.abs(velocityY)) {
      this.facing = velocityX < 0 ? 'left' : 'right'
    } else {
      this.facing = velocityY < 0 ? 'up' : 'down'
    }
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
      // Пріоритет вигляду: character > outfit > sprite (LPC) > плейсхолдер; invisible — без спрайта.
      const staticKey = npc.character ? staticTextureKey(npc.character) : null
      const hasStaticTexture = staticKey !== null && this.textures.exists(staticKey)
      const isStatic = npc.invisible === true || hasStaticTexture
      const characterId = isStatic ? null : characterIdOf(npc)
      const candidateKey = characterId ? lpcTextureKey(characterId) : null
      const animated = candidateKey !== null && this.textures.exists(candidateKey)
      const lpcKey = animated ? candidateKey : null
      let sprite: Phaser.GameObjects.Sprite
      if (npc.invisible) {
        sprite = this.add.sprite(npc.x, npc.y, NPC_PLACEHOLDER_TEXTURE).setOrigin(0.5, 1).setVisible(false)
      } else if (hasStaticTexture) {
        sprite = this.add.sprite(npc.x, npc.y, staticKey!).setOrigin(0.5, 1)
      } else if (lpcKey) {
        createLpcAnimations(this, lpcKey)
        sprite = this.add.sprite(npc.x, npc.y, lpcKey)
        sprite.play(lpcAnimationKey(lpcKey, 'idle', 'down'))
      } else {
        sprite = this.add.sprite(npc.x, npc.y, this.npcPlaceholderTexture(npc))
      }
      sprite.setDepth(this.depthFor(sprite, isStatic))

      const greetingText = this.add
        .text(npc.x, this.greetingY(sprite), greeting, {
          fontFamily: 'sans-serif',
          fontSize: '8px',
          color: '#111111',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: { x: 3, y: 2 },
          resolution: this.zoom * 2,
        })
        .setOrigin(0.5, 1)
        .setAlpha(0)
        .setDepth(GREETING_DEPTH)
        .setVisible(!npc.invisible)

      const entity: NpcEntity = {
        config: npc,
        sprite,
        animated,
        isStatic,
        lpcKey,
        greetingText,
        originX: npc.x,
        direction: Math.random() < 0.5 ? 1 : -1,
        hiding: false,
        hidden: false,
      }
      this.npcEntities.push(entity)
      if (!npc.invisible) this.scheduleNpcGreeting(entity)
    }
  }

  private npcPlaceholderTexture(npc: CityNpcConfig) {
    const outfit = npc.outfit
    if (!outfit) return NPC_PLACEHOLDER_TEXTURE
    const key = `npc-placeholder:${outfit}`
    if (this.textures.exists(key)) return key
    const color = OUTFIT_COLORS.find(([word]) => outfit.includes(word))?.[1] ?? 0xffd23f
    const graphics = this.make.graphics({ x: 0, y: 0 })
    graphics.fillStyle(color, 1)
    graphics.fillRect(0, 0, PLACEHOLDER_SIZE, PLACEHOLDER_SIZE)
    graphics.lineStyle(2, 0x000000, 0.35)
    graphics.strokeRect(1, 1, PLACEHOLDER_SIZE - 2, PLACEHOLDER_SIZE - 2)
    if (outfit.includes('glasses') && !outfit.includes('no_glasses')) {
      graphics.fillStyle(0x111111, 1)
      graphics.fillRect(6, 8, 8, 5)
      graphics.fillRect(18, 8, 8, 5)
      graphics.fillRect(14, 9, 4, 2)
    }
    graphics.generateTexture(key, PLACEHOLDER_SIZE, PLACEHOLDER_SIZE)
    graphics.destroy()
    return key
  }

  // Статичний спрайт має depth = y (origin внизу), решта — нижній край кадру.
  private depthFor(sprite: Phaser.GameObjects.Sprite, isStatic: boolean) {
    return isStatic ? sprite.y : bottomOf(sprite)
  }

  private greetingY(sprite: Phaser.GameObjects.Sprite) {
    // Статичний спрайт має origin внизу: підпис просто над головою.
    if (sprite.originY >= 1) return sprite.y - sprite.displayHeight - 2
    // У LPC-кадрі голова починається приблизно на чверті висоти.
    const headOffset = sprite.displayHeight * (sprite.width === LPC_FRAME_SIZE ? 0.25 : 0.5)
    return sprite.y - headOffset - 2
  }

  private gateOverrides() {
    // Об'єкти шарів doors/exits з Tiled з властивістю id перекривають координати з конфігу.
    const overrides = new Map<string, GateRect>()
    if (!this.map) return overrides
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
      this.gates.push({ kind, config, area, armed: false, lastOutside: null })
      if (kind === 'exit' && 'label' in config && config.label) {
        this.createExitLabel(config as ExitConfig)
      }
    }
    for (const door of this.zone.doors) add('door', door)
    for (const exit of this.zone.exits) add('exit', exit)
  }

  // Підпис над виходом (як привітання NPC), щоб перехід було видно здалеку.
  private createExitLabel(exit: ExitConfig) {
    const lang = useGameStore.getState().nativeLanguage ?? 'en'
    this.add
      .text(exit.x + exit.w / 2, exit.y - 2, exit.label![lang], {
        fontFamily: 'sans-serif',
        fontSize: '8px',
        color: '#111111',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: { x: 3, y: 2 },
        resolution: this.zoom * 2,
      })
      .setOrigin(0.5, 1)
      .setDepth(GREETING_DEPTH)
  }

  private targetTint(): DaylightTint {
    if (this.cutsceneRunning) return DUSK_TINT
    const day = daylightForClock(useGameStore.getState().gameClock)
    // Під час зливи небо темнішає поверх звичайного часу доби.
    return this.raining ? mixTint(day, RAIN_TINT, RAIN_TINT_STRENGTH) : day
  }

  private createTriggers() {
    for (const config of this.zone.triggers ?? []) {
      const area = this.add.zone(
        config.x + config.w / 2,
        config.y + config.h / 2,
        config.w,
        config.h,
      )
      this.physics.add.existing(area, true)
      this.triggers.push({ config, area })
    }
  }

  private checkTriggers() {
    for (const trigger of this.triggers) {
      const { flags, setFlag } = useGameStore.getState()
      if (flags[trigger.config.setFlag] === true) continue
      if (this.physics.overlap(this.player, trigger.area)) {
        setFlag(trigger.config.setFlag, true)
      }
    }
  }

  private createDaylight() {
    const camera = this.cameras.main
    this.daylightTint = this.targetTint()
    // scrollFactor 0 + zoom масштабують прямокутник навколо центру камери, тож він гарантовано вкриває екран.
    this.daylight = this.add
      .rectangle(0, 0, camera.width, camera.height, this.daylightTint.color, this.daylightTint.alpha)
      .setOrigin(0)
      .setScrollFactor(0)
      .setBlendMode(Phaser.BlendModes.MULTIPLY)
      .setDepth(DAYLIGHT_DEPTH)
  }

  private fadeDaylight() {
    const from = { ...this.daylightTint }
    const to = this.targetTint()
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

  private isRainingHere() {
    return this.zone.type === 'outdoor' && isRainActive(useGameStore.getState().flags)
  }

  private createRain() {
    if (!this.textures.exists(RAIN_TEXTURE)) {
      const graphics = this.make.graphics({ x: 0, y: 0 })
      graphics.fillStyle(0xc6dcff, 1)
      graphics.fillRect(0, 0, 1, 6)
      graphics.generateTexture(RAIN_TEXTURE, 1, 6)
      graphics.destroy()
    }
    this.updateRainArea()
    this.rain = this.add
      .particles(0, 0, RAIN_TEXTURE, {
        emitZone: { type: 'random', source: this.rainArea, quantity: 0 },
        lifespan: 450,
        speedX: { min: -30, max: -15 },
        speedY: { min: 220, max: 280 },
        alpha: { start: 0.85, end: 0 },
        quantity: 3,
        frequency: 16,
        emitting: this.raining,
      })
      .setScrollFactor(0)
      .setDepth(RAIN_DEPTH)
  }

  private updateRainArea() {
    // Частинки зі scrollFactor 0 масштабуються від центру камери, тож видима область — центр ± половина екрана / zoom.
    const camera = this.cameras.main
    const width = camera.width / this.zoom
    const height = camera.height / this.zoom
    this.rainArea.setTo(
      camera.width / 2 - width / 2,
      camera.height / 2 - height / 2 - 20,
      width,
      height,
    )
  }

  private updateWeather() {
    const raining = this.isRainingHere()
    if (raining === this.raining) return
    this.raining = raining
    if (raining) {
      this.rain.start()
      this.hidePatrolNpcs(true)
    } else {
      this.rain.stop()
      this.showPatrolNpcs()
    }
    this.fadeDaylight()
  }

  private nearestShelter(sprite: Phaser.GameObjects.Sprite) {
    const candidates = this.gates.filter((gate) => gate.kind === 'door')
    const pool = candidates.length ? candidates : this.gates
    let best: GateEntity | null = null
    let bestDistance = Infinity
    for (const gate of pool) {
      const distance = Phaser.Math.Distance.Between(sprite.x, sprite.y, gate.area.x, gate.area.y)
      if (distance < bestDistance) {
        bestDistance = distance
        best = gate
      }
    }
    return best
  }

  private hidePatrolNpcs(animate: boolean) {
    for (const entity of this.npcEntities) {
      if (!entity.config.patrol || entity.hidden || entity.hiding) continue
      const { sprite } = entity
      const finish = () => {
        entity.hiding = false
        entity.hidden = true
        sprite.setVisible(false)
        entity.greetingText.setVisible(false)
      }
      if (!animate) {
        finish()
        continue
      }

      entity.hiding = true
      const shelter = this.nearestShelter(sprite)
      const fadeOut = () =>
        this.tweens.add({ targets: sprite, alpha: 0, duration: 200, onComplete: finish })
      if (!shelter) {
        fadeOut()
        continue
      }
      const dx = shelter.area.x - sprite.x
      const dy = shelter.area.y - sprite.y
      if (entity.lpcKey) {
        const direction: Direction =
          Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down'
        sprite.play(lpcAnimationKey(entity.lpcKey, 'walk', direction), true)
      }
      this.tweens.add({
        targets: sprite,
        x: shelter.area.x,
        y: shelter.area.y,
        duration: (Math.hypot(dx, dy) / NPC_HIDE_SPEED) * 1000,
        onComplete: fadeOut,
      })
    }
  }

  private showPatrolNpcs() {
    for (const entity of this.npcEntities) {
      if (!entity.hidden && !entity.hiding) continue
      const { sprite, config } = entity
      this.tweens.killTweensOf(sprite)
      entity.hidden = false
      entity.hiding = false
      entity.originX = config.x
      sprite.setPosition(config.x, config.y).setAlpha(0).setVisible(true)
      entity.greetingText.setVisible(true)
      this.tweens.add({ targets: sprite, alpha: 1, duration: 400 })
    }
  }

  private isPresent(entity: NpcEntity) {
    return !entity.hidden && !entity.hiding
  }

  // Пунктир від NPC до виходу, поки з ним іде діалог: спершу прямо (по вертикалі), потім убік.
  private drawNpcRoute() {
    this.route.clear()
    const { activeDialogue } = useGameStore.getState()
    if (!activeDialogue) return
    const entity = this.npcEntities.find(
      (candidate) =>
        candidate.config.dialogueId === activeDialogue &&
        candidate.config.showRouteTo &&
        this.isPresent(candidate),
    )
    const gate = entity && this.gates.find((candidate) => candidate.config.id === entity.config.showRouteTo)
    if (!entity || !gate) return

    const start = { x: entity.sprite.x, y: bottomOf(entity.sprite) }
    const end = { x: gate.area.x, y: gate.area.y }
    const corner = { x: start.x, y: end.y }
    this.route.lineStyle(2, ROUTE_COLOR, 0.95)
    this.dashedLine(start, corner)
    this.dashedLine(corner, end)
    this.route.fillStyle(ROUTE_COLOR, 1)
    this.route.fillCircle(end.x, end.y, 4)
  }

  private dashedLine(from: { x: number; y: number }, to: { x: number; y: number }) {
    const length = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y)
    if (length === 0) return
    const ux = (to.x - from.x) / length
    const uy = (to.y - from.y) / length
    for (let offset = 0; offset < length; offset += ROUTE_DASH + ROUTE_GAP) {
      const dashEnd = Math.min(offset + ROUTE_DASH, length)
      this.route.lineBetween(
        from.x + ux * offset,
        from.y + uy * offset,
        from.x + ux * dashEnd,
        from.y + uy * dashEnd,
      )
    }
  }

  private setupCamera() {
    const camera = this.cameras.main
    this.zoom = this.computeZoom()
    camera.setBackgroundColor(this.zone.background?.fillColor ?? this.backgroundColor)
    camera.setZoom(this.zoom)
    camera.setRoundPixels(true)
    const viewWidth = camera.width / this.zoom
    const viewHeight = camera.height / this.zoom
    if (this.worldWidth <= viewWidth && this.worldHeight <= viewHeight) {
      camera.stopFollow()
      camera.removeBounds()
      camera.centerOn(this.worldWidth / 2, this.worldHeight / 2)
      return
    }
    if (this.zone.background) {
      // Phaser при зумі притискає меншу за екран вісь до краю, тож розширюємо bounds до розміру екрана,
      // а світ лишаємо по центру: вільне місце заливає fillColor.
      const boundsWidth = Math.max(this.worldWidth, viewWidth)
      const boundsHeight = Math.max(this.worldHeight, viewHeight)
      camera.setBounds(
        (this.worldWidth - boundsWidth) / 2,
        (this.worldHeight - boundsHeight) / 2,
        boundsWidth,
        boundsHeight,
      )
    } else {
      camera.setBounds(0, 0, this.worldWidth, this.worldHeight)
    }
    camera.startFollow(this.player, true)
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.cameras.main.setSize(gameSize.width, gameSize.height)
    this.daylight.setSize(gameSize.width, gameSize.height)
    // Zoom зони з background залежить від розміру екрана, тож спершу камера, потім зона дощу.
    this.setupCamera()
    this.updateRainArea()
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
    const { activeDialogue, activeExercise, pendingCutscene, pendingExit } =
      useGameStore.getState()
    return (
      activeDialogue !== null ||
      activeExercise !== null ||
      pendingCutscene !== null ||
      pendingExit !== null ||
      this.cutsceneRunning
    )
  }

  private fountainPoint() {
    const landmark = this.zone.landmarks?.find(
      (candidate) => candidate.id === FOUNTAIN_LANDMARK_ID,
    )
    return landmark ? { x: landmark.x, y: landmark.y } : null
  }

  private maybeStartCutscene() {
    const { pendingCutscene, setPendingCutscene } = useGameStore.getState()
    if (!pendingCutscene || this.cutsceneRunning) return
    // Поки є лише кат-сцена фонтану; невідому або не в тій зоні пропускаємо, щоб гра не застрягла.
    if (pendingCutscene !== FOUNTAIN_CUTSCENE_ID || !this.fountainPoint()) {
      setPendingCutscene(null)
      return
    }
    this.playFountainCutscene()
  }

  // Кат-сцена фонтану: рух вимкнено, камера панорамує, сутінки, струмені в ритмі, ~8 с.
  private playFountainCutscene() {
    const fountain = this.fountainPoint()!
    this.cutsceneRunning = true
    this.setHint(null)
    this.player.setVelocity(0)
    this.fadeDaylight()

    const landmarkImage = this.textures.exists(landmarkTextureKey(FOUNTAIN_LANDMARK_ID))
      ? this.textures.get(landmarkTextureKey(FOUNTAIN_LANDMARK_ID)).getSourceImage().height
      : 0
    const jetBaseY = fountain.y - Math.max(12, landmarkImage * 0.35)

    const camera = this.cameras.main
    camera.stopFollow()
    camera.pan(fountain.x, jetBaseY - 30, CUTSCENE_PAN_DURATION, 'Sine.easeInOut')

    if (!this.textures.exists(WATER_TEXTURE)) {
      const graphics = this.make.graphics({ x: 0, y: 0 })
      graphics.fillStyle(0xcdefff, 1)
      graphics.fillRect(0, 0, 2, 2)
      graphics.generateTexture(WATER_TEXTURE, 2, 2)
      graphics.destroy()
    }
    const jets = JET_OFFSETS.map((offset, index) =>
      this.add
        .particles(fountain.x + offset, jetBaseY, WATER_TEXTURE, {
          speedX: { min: -10, max: 10 },
          speedY: { onEmit: () => -this.jetSpeed(index) },
          gravityY: JET_GRAVITY,
          lifespan: 1400,
          quantity: 2,
          frequency: 25,
          alpha: { start: 0.95, end: 0 },
          scale: { start: 1.2, end: 0.6 },
          emitting: false,
        })
        .setDepth(FOUNTAIN_JETS_DEPTH),
    )
    this.time.delayedCall(CUTSCENE_JETS_DELAY, () => jets.forEach((jet) => jet.start()))

    void this.playFountainAudio()

    this.time.delayedCall(CUTSCENE_DURATION, () => {
      const finish = () => {
        this.fountainSound?.stop()
        const store = useGameStore.getState()
        store.setPendingCutscene(null)
        // Якщо кінцівки немає, повертаємо гравця у світ; інакше React покаже щоденник.
        if (!store.pendingEnding) {
          jets.forEach((jet) => jet.stop())
          this.cutsceneRunning = false
          this.fadeDaylight()
          this.setupCamera()
          camera.fadeIn(FADE_DURATION)
        }
      }
      camera.fadeOut(CUTSCENE_FADE_OUT)
      camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, finish)
    })
  }

  // Звук фонтану необов'язковий: грає, лише якщо є public/audio/fountain.mp3.
  // Спершу HEAD-запит — dev-сервер і Vercel на відсутній файл віддають index.html, і Phaser падав би на декодуванні.
  private async playFountainAudio() {
    if (missingAudio.has(FOUNTAIN_AUDIO_KEY)) return
    if (!this.cache.audio.exists(FOUNTAIN_AUDIO_KEY)) {
      try {
        const response = await fetch(FOUNTAIN_AUDIO_URL, { method: 'HEAD' })
        const type = response.headers.get('content-type') ?? ''
        if (!response.ok || !type.startsWith('audio/')) {
          missingAudio.add(FOUNTAIN_AUDIO_KEY)
          return
        }
      } catch {
        missingAudio.add(FOUNTAIN_AUDIO_KEY)
        return
      }
      await new Promise<void>((resolve) => {
        this.load.audio(FOUNTAIN_AUDIO_KEY, FOUNTAIN_AUDIO_URL)
        this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve())
        this.load.start()
      })
    }
    if (!this.cutsceneRunning || !this.cache.audio.exists(FOUNTAIN_AUDIO_KEY)) return
    this.fountainSound = this.sound.add(FOUNTAIN_AUDIO_KEY)
    this.fountainSound.play()
  }

  // Швидкість струменя змінюється синусоїдою, сусідні струмені — зі зсувом фази.
  private jetSpeed(index: number) {
    const t = this.time.now / 1000
    return 170 + 70 * Math.sin(t * 2.4 + index * 0.9)
  }

  private isOpen(gate: GateEntity) {
    return isGateOpen(gate.config, useGameStore.getState().flags)
  }

  private isPlayerIn(gate: GateEntity) {
    return this.physics.overlap(this.player, gate.area)
  }

  private updateNpcs(delta: number) {
    const { activeDialogue } = useGameStore.getState()
    for (const entity of this.npcEntities) {
      const { sprite } = entity
      if (entity.hiding) {
        sprite.setDepth(this.depthFor(sprite, entity.isStatic))
        if (entity.isStatic && !entity.config.invisible) this.animateStatic(sprite, 0, true)
      }
      if (!this.isPresent(entity)) continue
      // Співрозмовник не ходить, поки триває діалог.
      const talking = activeDialogue !== null && activeDialogue === entity.config.dialogueId
      if (talking && entity.lpcKey) {
        sprite.play(lpcAnimationKey(entity.lpcKey, 'idle', 'down'), true)
      }
      if (entity.config.patrol && !talking) {
        sprite.x += entity.direction * NPC_PATROL_SPEED * (delta / 1000)
        if (sprite.x >= entity.originX + NPC_PATROL_RANGE) {
          sprite.x = entity.originX + NPC_PATROL_RANGE
          entity.direction = -1
        } else if (sprite.x <= entity.originX - NPC_PATROL_RANGE) {
          sprite.x = entity.originX - NPC_PATROL_RANGE
          entity.direction = 1
        }
        if (entity.lpcKey) {
          sprite.play(
            lpcAnimationKey(entity.lpcKey, 'walk', entity.direction < 0 ? 'left' : 'right'),
            true,
          )
        }
      }
      if (entity.isStatic && !entity.config.invisible) {
        const walking = entity.config.patrol && !talking
        this.animateStatic(sprite, walking ? entity.direction : 0, walking)
      }
      sprite.setDepth(this.depthFor(sprite, entity.isStatic))
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
      if (!this.isPresent(entity)) continue
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
    if (door) {
      this.setHint({ kind: 'door', gate: door })
      return
    }

    // Біля закритого виходу з lockedHint пояснюємо, чого бракує.
    const locked = this.gates.find(
      (gate) =>
        gate.kind === 'exit' &&
        'lockedHint' in gate.config &&
        gate.config.lockedHint &&
        !this.isOpen(gate) &&
        this.isPlayerNear(gate, LOCKED_HINT_PADDING),
    )
    this.setHint(locked ? { kind: 'locked', gate: locked } : null)
  }

  private isPlayerNear(gate: GateEntity, padding: number) {
    const body = this.player.body as Phaser.Physics.Arcade.Body
    const { x, y, w, h } = gate.config
    return (
      body.right >= x - padding &&
      body.left <= x + w + padding &&
      body.bottom >= y - padding &&
      body.top <= y + h + padding
    )
  }

  private setHint(target: HintTarget | null) {
    const key = !target
      ? null
      : target.kind === 'npc'
        ? `npc:${target.npc.id}`
        : `${target.kind}:${target.gate.config.id}`
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
    } else if (target?.kind === 'locked') {
      const key = (target.gate.config as ExitConfig).lockedHint!
      hint = {
        kind: 'locked',
        id: target.gate.config.id,
        label: {
          en: i18next.t(key, { lng: 'en' }),
          uk: i18next.t(key, { lng: 'uk' }),
        },
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
        gate.lastOutside = { x: this.player.x, y: this.player.y }
      } else if (gate.armed && this.isOpen(gate)) {
        if ((gate.config as ExitConfig).confirm) {
          // Не спрацьовує повторно, поки гравець не вийде з прямокутника.
          gate.armed = false
          this.askExitConfirmation(gate)
        } else {
          this.transitionThrough(gate)
        }
        return
      }
    }
  }

  // Зупиняє гравця і віддає рішення React: вікно підтвердження живе в UI-шарі.
  private askExitConfirmation(gate: GateEntity) {
    this.player.setVelocity(0)
    this.setHint(null)
    this.saveSpawn()
    useGameStore.getState().setPendingExit({ zoneId: this.zone.id, exitId: gate.config.id })
  }

  private handleExitDecision(decision: ExitDecisionEvent) {
    if (decision.zoneId !== this.zone.id || this.transitioning) return
    const gate = this.gates.find(
      (candidate) => candidate.kind === 'exit' && candidate.config.id === decision.exitId,
    )
    if (!gate) return
    if (decision.confirmed) {
      this.transitionThrough(gate)
    } else {
      this.pushBackFromExit(gate)
    }
  }

  // «Ще ні»: гравець відсувається на 12 px назад, туди, звідки прийшов.
  private pushBackFromExit(gate: GateEntity) {
    const body = this.player.body as Phaser.Physics.Arcade.Body
    const from = gate.lastOutside ?? { x: this.player.x, y: this.player.y - 1 }
    let dx = from.x - this.player.x
    let dy = from.y - this.player.y
    const length = Math.hypot(dx, dy)
    if (length === 0) {
      dx = 0
      dy = -1
    } else {
      dx /= length
      dy /= length
    }
    const point = this.clampToMap({
      x: this.player.x + dx * EXIT_CANCEL_PUSHBACK,
      y: this.player.y + dy * EXIT_CANCEL_PUSHBACK,
    })
    body.reset(point.x, point.y)
    this.lastSavedSpawn = null
    this.saveSpawn()
  }

  private interact() {
    if (this.transitioning || this.isInputBlocked() || !this.hintTarget) return
    if (this.hintTarget.kind === 'npc') {
      this.saveSpawn()
      useGameStore.getState().setActiveDialogue(this.hintTarget.npc.dialogueId)
      return
    }
    if (this.hintTarget.kind === 'door' && this.isOpen(this.hintTarget.gate)) {
      this.transitionThrough(this.hintTarget.gate)
    }
  }

  private transitionThrough(gate: GateEntity) {
    this.transitioning = true
    this.player.setVelocity(0)
    this.setHint(null)

    const { target, spawn } = gate.config
    if (target === this.zone.id) {
      this.teleportWithinZone(spawn)
      return
    }
    if (gate.kind === 'door') {
      useGameStore.getState().markDoorEntered(gate.config.id, this.zone.id)
    }
    this.goToZone(target, spawn)
  }

  // Запит на перехід ззовні (DebugPanel): у spawn цільової зони.
  private handleZoneRequest(zoneId: string) {
    const city = useGameStore.getState().cityConfig
    const zone = city?.zones.find((candidate) => candidate.id === zoneId)
    if (!zone || this.transitioning || this.cutsceneRunning) return
    this.transitioning = true
    this.player.setVelocity(0)
    this.setHint(null)
    this.goToZone(zone.id, zone.spawn)
  }

  private goToZone(target: string, spawn: { x: number; y: number }) {
    this.cameras.main.fadeOut(FADE_DURATION)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const city = useGameStore.getState().cityConfig!
      const targetZone = getZone(city, target)
      useGameStore.setState({ currentZone: target, spawn })
      const data: ZoneSceneData = { zoneId: target }
      this.scene.start(sceneKeyForZone(targetZone), data)
    })
  }

  // Вихід у ту саму зону (короткий шлях до Мурів): без перезапуску сцени, тільки fade і переміщення.
  private teleportWithinZone(spawn: { x: number; y: number }) {
    const camera = this.cameras.main
    camera.fadeOut(FADE_DURATION)
    camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const point = this.clampToMap(spawn)
      ;(this.player.body as Phaser.Physics.Arcade.Body).reset(point.x, point.y)
      this.player.setDepth(this.playerStatic ? this.player.y : bottomOf(this.player))
      // Гравець міг опинитися в іншому виході — він спрацює тільки після того, як гравець з нього вийде.
      for (const gate of this.gates) gate.armed = false
      this.transitioning = false
      this.lastSavedSpawn = null
      this.saveSpawn()
      this.setupCamera()
      camera.fadeIn(FADE_DURATION)
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
