import { useEffect } from 'react'
import Phaser from 'phaser'
import { useGameStore } from '../store/useGameStore'
import { WorldScene } from './scenes/WorldScene'
import { InteriorScene } from './scenes/InteriorScene'
import {
  INTERIOR_SCENE_KEY,
  WORLD_SCENE_KEY,
  sceneKeyForZone,
  type ZoneSceneData,
} from './scenes/sceneKeys'

// Гра створюється один раз. Стартова сцена береться з currentZone у сторі,
// далі переходи між зонами робить сама сцена.
export function PhaserGame() {
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
    game.scene.add(WORLD_SCENE_KEY, WorldScene, false)
    game.scene.add(INTERIOR_SCENE_KEY, InteriorScene, false)

    const { cityConfig, currentZone } = useGameStore.getState()
    const zone = cityConfig?.zones.find((candidate) => candidate.id === currentZone)
    if (zone) {
      const data: ZoneSceneData = { zoneId: zone.id }
      game.scene.start(sceneKeyForZone(zone), data)
    }

    return () => {
      game.destroy(true)
    }
  }, [])

  return <div id="phaser-container" />
}
