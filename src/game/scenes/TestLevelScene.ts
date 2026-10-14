import Phaser from 'phaser'
import i18next from 'i18next'
import type { CityNpcConfig } from '../../api/getCityConfig'
import { useGameStore } from '../../store/useGameStore'

export const TEST_LEVEL_SCENE_KEY = 'vinnytsia_test_level'

const MOVE_SPEED = 200
const TILEMAP_KEY = 'vinnytsia_test'
const TILESET_IMAGE_KEY = 'tileset'
const NPC_INTERACTION_RADIUS = 48
const NPC_PATROL_SPEED = 40
const NPC_PATROL_RANGE = 48
const NPC_GREETING_MIN_DELAY = 3000
const NPC_GREETING_MAX_DELAY = 6000
const SPAWN_SAVE_INTERVAL = 500

export interface TestLevelSceneData {
  npcs?: CityNpcConfig[]
}

interface NpcEntity {
  config: CityNpcConfig
  sprite: Phaser.GameObjects.Image
  greetingText: Phaser.GameObjects.Text
  originX: number
  direction: 1 | -1
}

export class TestLevelScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Image
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: {
    up: Phaser.Input.Keyboard.Key
    down: Phaser.Input.Keyboard.Key
    left: Phaser.Input.Keyboard.Key
    right: Phaser.Input.Keyboard.Key
  }
  private npcs: CityNpcConfig[] = []
  private npcEntities: NpcEntity[] = []
  private nearbyNpcId: string | null = null
  private lastSavedSpawn: { x: number; y: number } | null = null

  constructor() {
    super(TEST_LEVEL_SCENE_KEY)
  }

  init(data: TestLevelSceneData) {
    this.npcs = data.npcs ?? []
    this.npcEntities = []
    this.nearbyNpcId = null
    this.lastSavedSpawn = null
  }

  preload() {
    this.load.tilemapTiledJSON(TILEMAP_KEY, '/tilemaps/vinnytsia_test.json')
    this.load.image(TILESET_IMAGE_KEY, '/tilemaps/tileset.png')

    const graphics = this.make.graphics({ x: 0, y: 0 })
    graphics.fillStyle(0xff5a5f, 1)
    graphics.fillRect(0, 0, 32, 32)
    graphics.generateTexture('player-placeholder', 32, 32)
    graphics.clear()
    graphics.fillStyle(0xffd23f, 1)
    graphics.fillRect(0, 0, 32, 32)
    graphics.generateTexture('npc-placeholder', 32, 32)
    graphics.destroy()
  }

  create() {
    const map = this.make.tilemap({ key: TILEMAP_KEY })
    const tileset = map.addTilesetImage('tileset', TILESET_IMAGE_KEY)!

    const groundLayer = map.createLayer('ground', tileset, 0, 0)!
    const collisionLayer = map.createLayer('collision', tileset, 0, 0)!
    collisionLayer.setCollisionByProperty({ collides: true })

    const savedSpawn = useGameStore.getState().spawn
    this.player = this.physics.add.image(
      savedSpawn?.x ?? map.widthInPixels / 2,
      savedSpawn?.y ?? map.heightInPixels / 2,
      'player-placeholder',
    )
    this.player.setCollideWorldBounds(true)

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    this.physics.add.collider(this.player, collisionLayer)

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels)
    this.cameras.main.startFollow(this.player)

    groundLayer.setDepth(0)
    collisionLayer.setDepth(1)
    this.player.setDepth(2)

    const greeting = i18next.t('world.npcGreeting')

    for (const npc of this.npcs) {
      const sprite = this.add.image(npc.x, npc.y, 'npc-placeholder').setDepth(2)
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
  }

  update(_time: number, delta: number) {
    this.player.setVelocity(0)
    this.updateNpcPatrol(delta)

    if (this.isInputBlocked()) {
      this.setNearbyNpc(null)
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

    this.updateNpcInteractions()
  }

  private isInputBlocked() {
    const { activeDialogue, activeExercise } = useGameStore.getState()
    return activeDialogue !== null || activeExercise !== null
  }

  private saveSpawn() {
    if (!this.player?.active) return
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

  private interact() {
    if (this.isInputBlocked() || !this.nearbyNpcId) return
    const npc = this.npcs.find((candidate) => candidate.id === this.nearbyNpcId)
    if (!npc) return
    this.saveSpawn()
    useGameStore.getState().setActiveDialogue(npc.dialogueId)
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

  private updateNpcInteractions() {
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

    this.setNearbyNpc(closestNpc)
  }

  private setNearbyNpc(npc: CityNpcConfig | null) {
    const npcId = npc?.id ?? null
    if (npcId === this.nearbyNpcId) return
    this.nearbyNpcId = npcId
    useGameStore
      .getState()
      .setInteractionHint(
        npc ? { kind: 'npc', id: npc.id, label: npc.name } : null,
      )
  }
}
