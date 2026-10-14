import { ZoneSceneBase } from './ZoneSceneBase'
import { WORLD_SCENE_KEY } from './sceneKeys'

/** Зовнішні зони (outdoor). */
export class WorldScene extends ZoneSceneBase {
  protected readonly backgroundColor = '#1d2b1f'

  constructor() {
    super(WORLD_SCENE_KEY)
  }
}
