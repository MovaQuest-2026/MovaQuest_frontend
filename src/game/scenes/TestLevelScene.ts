import Phaser from 'phaser'

const MOVE_SPEED = 200
const TILEMAP_KEY = 'vinnytsia_test'
const TILESET_IMAGE_KEY = 'tileset'

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
    this.load.tilemapTiledJSON(TILEMAP_KEY, '/tilemaps/vinnytsia_test.json')
    this.load.image(TILESET_IMAGE_KEY, '/tilemaps/tileset.png')

    const graphics = this.make.graphics({ x: 0, y: 0 })
    graphics.fillStyle(0xff5a5f, 1)
    graphics.fillRect(0, 0, 32, 32)
    graphics.generateTexture('player-placeholder', 32, 32)
    graphics.destroy()
  }

  create() {
    const map = this.make.tilemap({ key: TILEMAP_KEY })
    const tileset = map.addTilesetImage('tileset', TILESET_IMAGE_KEY)!

    const groundLayer = map.createLayer('ground', tileset, 0, 0)!
    const collisionLayer = map.createLayer('collision', tileset, 0, 0)!
    collisionLayer.setCollisionByProperty({ collides: true })

    this.player = this.physics.add.image(
      map.widthInPixels / 2,
      map.heightInPixels / 2,
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
