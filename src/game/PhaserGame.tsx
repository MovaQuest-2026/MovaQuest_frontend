import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { TestLevelScene, TEST_LEVEL_SCENE_KEY } from './scenes/TestLevelScene'
import type { CityNpcConfig } from '../api/getCityConfig'

interface PhaserGameProps {
  npcs: CityNpcConfig[]
}

export function PhaserGame({ npcs }: PhaserGameProps) {
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
    })

    game.scene.add(TEST_LEVEL_SCENE_KEY, TestLevelScene, true, { npcs })

    return () => {
      game.destroy(true)
    }
  }, [npcs])

  return <div id="phaser-container" ref={containerRef} />
}
