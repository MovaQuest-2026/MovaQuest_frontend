import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { TestLevelScene } from './scenes/TestLevelScene'

export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'phaser-container',
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: '#000000',
      physics: {
        default: 'arcade',
        arcade: {
          debug: false,
        },
      },
      scene: [TestLevelScene],
    })

    return () => {
      game.destroy(true)
    }
  }, [])

  return <div id="phaser-container" ref={containerRef} />
}
