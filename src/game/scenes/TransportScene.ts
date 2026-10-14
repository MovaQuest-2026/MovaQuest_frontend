import Phaser from 'phaser'
import { useGameStore } from '../../store/useGameStore'
import { ZoneSceneBase } from './ZoneSceneBase'
import { TRANSPORT_SCENE_KEY } from './sceneKeys'

const WINDOW_TEXTURE = 'transport-window-view'
const WINDOW_TEXTURE_WIDTH = 320
const WINDOW_TOP = 6
const WINDOW_HEIGHT = 28
const WINDOW_POST_SPACING = 48
// Вище за тайлові шари, нижче за персонажів (їхня глибина — y).
const WINDOW_DEPTH = -500
const MAX_SPEED = 90
const ACCELERATION = 45

/**
 * Салон транспорту (тролейбус): інтер'єр, за вікнами прокручується вулиця.
 * Їде, поки не прозвучало оголошення (trolley_announced), далі стоїть і відкривається вихід.
 */
export class TransportScene extends ZoneSceneBase {
  protected readonly backgroundColor = '#1b1f27'
  private windowView!: Phaser.GameObjects.TileSprite
  private speed = 0

  constructor() {
    super(TRANSPORT_SCENE_KEY)
  }

  protected createZoneExtras() {
    this.ensureWindowTexture()
    const left = this.map.tileWidth
    const width = this.map.widthInPixels - left * 2
    this.windowView = this.add
      .tileSprite(left, WINDOW_TOP, width, WINDOW_HEIGHT, WINDOW_TEXTURE)
      .setOrigin(0)
      .setDepth(WINDOW_DEPTH)

    const frame = this.add.graphics().setDepth(WINDOW_DEPTH + 1)
    frame.lineStyle(2, 0x2b2f38, 1)
    frame.strokeRect(left, WINDOW_TOP, width, WINDOW_HEIGHT)
    for (let x = left + WINDOW_POST_SPACING; x < left + width; x += WINDOW_POST_SPACING) {
      frame.fillStyle(0x2b2f38, 1)
      frame.fillRect(x - 2, WINDOW_TOP, 4, WINDOW_HEIGHT)
    }

    // Після F5 тролейбус одразу в правильному стані: їде або стоїть.
    this.speed = this.isMoving() ? MAX_SPEED : 0
  }

  protected updateZoneExtras(delta: number) {
    const target = this.isMoving() ? MAX_SPEED : 0
    const step = (ACCELERATION * delta) / 1000
    this.speed =
      this.speed < target
        ? Math.min(target, this.speed + step)
        : Math.max(target, this.speed - step)
    this.windowView.tilePositionX += (this.speed * delta) / 1000
  }

  private isMoving() {
    return useGameStore.getState().flags.trolley_announced !== true
  }

  // Процедурна вулиця за вікном: небо, будинки з вікнами, дерева. Безшовна по горизонталі.
  private ensureWindowTexture() {
    if (this.textures.exists(WINDOW_TEXTURE)) return
    const graphics = this.make.graphics({ x: 0, y: 0 })
    graphics.fillStyle(0x9fd3f0, 1)
    graphics.fillRect(0, 0, WINDOW_TEXTURE_WIDTH, WINDOW_HEIGHT)

    const random = new Phaser.Math.RandomDataGenerator(['trolleybus'])
    const buildingColors = [0xc9b8a6, 0xb5a7b8, 0xd8c7a0, 0xa9b5bf]
    for (let x = 4; x < WINDOW_TEXTURE_WIDTH - 40; ) {
      const width = random.between(22, 36)
      const height = random.between(14, 24)
      const top = WINDOW_HEIGHT - height
      graphics.fillStyle(random.pick(buildingColors), 1)
      graphics.fillRect(x, top, width, height)
      graphics.fillStyle(0x5d6b80, 1)
      for (let wy = top + 3; wy < WINDOW_HEIGHT - 4; wy += 6) {
        for (let wx = x + 3; wx < x + width - 3; wx += 6) graphics.fillRect(wx, wy, 3, 3)
      }
      x += width + random.between(4, 10)
      if (random.frac() < 0.5) {
        graphics.fillStyle(0x3f8f5a, 1)
        graphics.fillCircle(x - 2, WINDOW_HEIGHT - 6, 5)
      }
    }
    graphics.fillStyle(0x4a4f5c, 1)
    graphics.fillRect(0, WINDOW_HEIGHT - 3, WINDOW_TEXTURE_WIDTH, 3)
    graphics.generateTexture(WINDOW_TEXTURE, WINDOW_TEXTURE_WIDTH, WINDOW_HEIGHT)
    graphics.destroy()
  }
}
