import { useEffect } from 'react'
import Phaser from 'phaser'
import { useGameStore } from '../store/useGameStore'
import { WorldScene } from './scenes/WorldScene'
import { InteriorScene } from './scenes/InteriorScene'
import { TransportScene } from './scenes/TransportScene'
import {
  INTERIOR_SCENE_KEY,
  TRANSPORT_SCENE_KEY,
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
      backgroundColor: '#000000',
      pixelArt: true,
      roundPixels: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
        parent: 'phaser-container',
        width: '100%',
        height: '100%',
      },
      physics: {
        default: 'arcade',
        arcade: {
          debug: false,
        },
      },
    })
    game.scene.add(WORLD_SCENE_KEY, WorldScene, false)
    game.scene.add(INTERIOR_SCENE_KEY, InteriorScene, false)
    game.scene.add(TRANSPORT_SCENE_KEY, TransportScene, false)

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
