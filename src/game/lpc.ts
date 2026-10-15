import type Phaser from 'phaser'

export const LPC_FRAME_SIZE = 64

export type Direction = 'up' | 'left' | 'down' | 'right'

// Стандартна розкладка Universal LPC: рядки ходьби 8–11, 9 кадрів (0 — стоїть, 1–8 — крок).
const WALK_ROWS: Record<Direction, number> = { up: 8, left: 9, down: 10, right: 11 }
const WALK_FPS = 10

export function lpcTextureKey(characterId: string) {
  return `lpc:${characterId}`
}

export function lpcAnimationKey(
  textureKey: string,
  kind: 'walk' | 'idle',
  direction: Direction,
) {
  return `${textureKey}:${kind}-${direction}`
}

/** Створює анімації walk-* і idle-* для LPC-спрайтшита, якщо їх ще немає. */
export function createLpcAnimations(scene: Phaser.Scene, key: string) {
  const texture = scene.textures.get(key)
  const columns = Math.floor(texture.getSourceImage().width / LPC_FRAME_SIZE)

  for (const [direction, row] of Object.entries(WALK_ROWS) as [Direction, number][]) {
    const first = row * columns
    const walkKey = lpcAnimationKey(key, 'walk', direction)
    if (!scene.anims.exists(walkKey)) {
      scene.anims.create({
        key: walkKey,
        frames: scene.anims.generateFrameNumbers(key, {
          start: first + 1,
          end: first + 8,
        }),
        frameRate: WALK_FPS,
        repeat: -1,
      })
    }
    const idleKey = lpcAnimationKey(key, 'idle', direction)
    if (!scene.anims.exists(idleKey)) {
      scene.anims.create({
        key: idleKey,
        frames: [{ key, frame: first }],
      })
    }
  }
}
