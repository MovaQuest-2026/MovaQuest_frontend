import { ZoneSceneBase } from './ZoneSceneBase'
import { INTERIOR_SCENE_KEY } from './sceneKeys'

/** Приміщення (interior): зала автовокзалу, кіоск, квартира, кафе тощо. */
export class InteriorScene extends ZoneSceneBase {
  protected readonly backgroundColor = '#14100c'

  constructor() {
    super(INTERIOR_SCENE_KEY)
  }
}
