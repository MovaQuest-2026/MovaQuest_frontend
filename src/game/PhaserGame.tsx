import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import {
  TestLevelScene,
  TEST_LEVEL_SCENE_KEY,
  type TestLevelSceneData,
} from './scenes/TestLevelScene'
import type { ZoneConfig } from '../api/getCityConfig'

interface PhaserGameProps {
  zone: ZoneConfig
}

export function PhaserGame({ zone }: PhaserGameProps) {
  const gameRef = useRef<Phaser.Game | null>(null)

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
    game.scene.add(TEST_LEVEL_SCENE_KEY, TestLevelScene, false)
    gameRef.current = game

    return () => {
      gameRef.current = null
      game.destroy(true)
    }
  }, [])

  useEffect(() => {
    const data: TestLevelSceneData = { npcs: zone.npcs }
    gameRef.current?.scene.start(TEST_LEVEL_SCENE_KEY, data)
  }, [zone])

  return <div id="phaser-container" />
}
