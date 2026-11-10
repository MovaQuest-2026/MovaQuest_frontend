import { beforeEach, describe, expect, it, vi } from 'vitest'
import lessonJson from '../../mocks/lessons/shop-spain.json'
import type { Lesson } from '../../types/lesson'

const calls: unknown[][] = []
vi.mock('../../api/analytics', () => {
  const rec =
    (name: string) =>
    (...args: unknown[]) =>
      calls.push([name, ...args.slice(1)])
  return {
    trackChoiceMade: rec('choice_made'),
    trackLessonCompleted: rec('lesson_completed'),
    trackPhrasesRevealed: rec('phrases_revealed'),
    trackRetry: rec('retry'),
    trackSceneStarted: rec('scene_started'),
    trackLessonStarted: rec('lesson_started'),
    trackMicDenied: rec('mic_denied'),
  }
})

const { usePlayerStore } = await import('../../store/usePlayerStore')
const { useUserStore } = await import('../../store/useUserStore')
const lesson = lessonJson as Lesson

describe('player analytics', () => {
  beforeEach(() => {
    calls.length = 0
    usePlayerStore.getState().load(lesson)
    useUserStore.getState().resetProgress()
  })

  it('emits the expected events for an unclear-unclear-correct-wrong run', () => {
    const { dispatch, start } = usePlayerStore.getState()
    const play = () => {
      dispatch({ type: 'CLIP_READY' })
      dispatch({ type: 'CLIP_ENDED' })
    }
    dispatch({ type: 'CLIP_READY' }) // кліп готовий ще до «Tap to start»
    start()
    dispatch({ type: 'CLIP_ENDED' })
    dispatch({ type: 'RESULT', branch: 'unclear', source: 'voice' })
    play()
    dispatch({ type: 'RESULT', branch: 'unclear', source: 'voice' })
    play()
    dispatch({ type: 'RESULT', branch: 'correct', source: 'tap' })
    play()
    dispatch({ type: 'REVEAL_PHRASES' })
    dispatch({ type: 'RESULT', branch: 'wrong', source: 'tap' })
    play()

    expect(calls).toEqual([
      ['lesson_started'],
      ['scene_started', 's1_order'],
      ['choice_made', 's1_order', 'unclear', 'voice'],
      ['retry', 's1_order', 1],
      ['scene_started', 's1u_repeat'],
      ['choice_made', 's1_order', 'unclear', 'voice'],
      ['retry', 's1_order', 2],
      ['phrases_revealed', 's1_order', true],
      ['scene_started', 's1u_repeat'],
      ['choice_made', 's1_order', 'correct', 'tap'],
      ['scene_started', 's2_pay'],
      ['phrases_revealed', 's2_pay', false],
      ['choice_made', 's2_pay', 'wrong', 'tap'],
      ['scene_started', 's2w_refuse'],
      ['lesson_completed', 'missed'],
    ])
    expect(useUserStore.getState().completedLessons['shop-spain']?.outcome).toBe('missed')
    expect(usePlayerStore.getState().lastResult).toMatchObject({ lessonId: 'shop-spain', outcome: 'missed' })
  })
})
