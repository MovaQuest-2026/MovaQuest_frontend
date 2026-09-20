import Phaser from 'phaser'

const MOVE_SPEED = 200

export class TestLevelScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Image
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: {
    up: Phaser.Input.Keyboard.Key
    down: Phaser.Input.Keyboard.Key
    left: Phaser.Input.Keyboard.Key
    right: Phaser.Input.Keyboard.Key
  }

  constructor() {
    super('vinnytsia_test_level')
  }

  preload() {
    const graphics = this.make.graphics({ x: 0, y: 0 })
    graphics.fillStyle(0xff5a5f, 1)
    graphics.fillRect(0, 0, 32, 32)
    graphics.generateTexture('player-placeholder', 32, 32)
    graphics.destroy()
  }

  create() {
    this.cameras.main.setBackgroundColor('#2f7a4f')

    this.player = this.physics.add.image(
      this.scale.width / 2,
      this.scale.height / 2,
      'player-placeholder',
    )
    this.player.setCollideWorldBounds(true)

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    }
  }

  update() {
    this.player.setVelocity(0)

    const left = this.cursors.left.isDown || this.wasd.left.isDown
    const right = this.cursors.right.isDown || this.wasd.right.isDown
    const up = this.cursors.up.isDown || this.wasd.up.isDown
    const down = this.cursors.down.isDown || this.wasd.down.isDown

    if (left) this.player.setVelocityX(-MOVE_SPEED)
    else if (right) this.player.setVelocityX(MOVE_SPEED)

    if (up) this.player.setVelocityY(-MOVE_SPEED)
    else if (down) this.player.setVelocityY(MOVE_SPEED)
  }
}
