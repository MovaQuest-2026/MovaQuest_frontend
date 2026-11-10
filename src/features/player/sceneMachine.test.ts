import { describe, expect, it } from 'vitest'
import lessonJson from '../../mocks/lessons/shop-spain.json'
import type { BranchKind, Lesson } from '../../types/lesson'
import {
  createInitialState,
  restoreState,
  stumbles,
  transition,
  upcomingClips,
  type MachineEvent,
  type MachineState,
} from './sceneMachine'

const lesson = lessonJson as Lesson

function run(events: MachineEvent[], from: MachineState = createInitialState(lesson)): MachineState {
  return events.reduce((s, e) => transition(lesson, s, e), from)
}

const play: MachineEvent[] = [{ type: 'CLIP_READY' }, { type: 'CLIP_ENDED' }]
const answer = (branch: BranchKind, source: 'voice' | 'tap' = 'tap'): MachineEvent => ({
  type: 'RESULT',
  branch,
  source,
})

describe('sceneMachine', () => {
  it('starts loading the first scene', () => {
    const s = createInitialState(lesson)
    expect(s).toMatchObject({ status: 'loading', currentSceneId: 's1_order', retryCount: 0, phrasesRevealed: false })
  })

  it('stops on the last frame of a choice scene', () => {
    const s = run(play)
    expect(s).toMatchObject({ status: 'awaitingChoice', currentSceneId: 's1_order', lastChoiceSceneId: 's1_order' })
  })

  it('correct path ends in e_done (perfect)', () => {
    const s = run([...play, answer('correct'), ...play, answer('correct', 'voice'), ...play])
    expect(s.status).toBe('ended')
    expect(s.currentSceneId).toBe('e_done')
    expect(s.outcome).toBe('perfect')
    expect(stumbles(s.history)).toEqual([])
  })

  it('wrong path ends in e_soda (partial)', () => {
    const s = run([...play, answer('wrong'), ...play, answer('wrong'), ...play])
    expect(s.history.map((h) => h.sceneId)).toEqual(['s1_order', 's1w_drink', 'e_soda'])
    expect(s).toMatchObject({ status: 'ended', currentSceneId: 'e_soda', outcome: 'partial' })
    expect(stumbles(s.history).map((h) => h.sceneId)).toEqual(['s1_order', 's1w_drink'])
  })

  it('wrong with a correction recovers to e_done', () => {
    const s = run([...play, answer('wrong'), ...play, answer('correct'), ...play, answer('correct'), ...play])
    expect(s.history.map((h) => h.sceneId)).toEqual(['s1_order', 's1w_drink', 's2_pay', 'e_done'])
    expect(s.outcome).toBe('perfect')
  })

  it('$return resumes the same choice without replaying its clip', () => {
    const s = run([...play, answer('unclear'), ...play])
    expect(s).toMatchObject({
      status: 'awaitingChoice',
      currentSceneId: 's1_order',
      entry: 'resume',
      retryCount: 1,
      phrasesRevealed: false,
    })
    // CLIP_READY / CLIP_ENDED від кліпу, що завершився, нічого не змінюють.
    expect(run([{ type: 'CLIP_READY' }, { type: 'CLIP_ENDED' }], s).status).toBe('awaitingChoice')
  })

  it('two unclear in a row reveal the phrases automatically', () => {
    const once = run([...play, answer('unclear', 'voice'), ...play])
    expect(once.phrasesRevealed).toBe(false)
    const twice = run([answer('unclear', 'voice'), ...play], once)
    expect(twice).toMatchObject({
      status: 'awaitingChoice',
      currentSceneId: 's1_order',
      retryCount: 2,
      phrasesRevealed: true,
      autoRevealed: true,
    })
  })

  it('retry counter resets at the next choice point', () => {
    const s = run([...play, answer('unclear'), ...play, answer('unclear'), ...play, answer('correct'), ...play])
    expect(s).toMatchObject({ currentSceneId: 's2_pay', retryCount: 0, phrasesRevealed: false })
    // $return з s2_pay повертає саме в s2_pay, хоч сцена «repeat» спільна.
    const back = run([answer('unclear'), ...play], s)
    expect(back).toMatchObject({ status: 'awaitingChoice', currentSceneId: 's2_pay', retryCount: 1 })
  })

  it('voice flow goes through listening and evaluating', () => {
    let s = run([...play, { type: 'START_LISTENING' }])
    expect(s.status).toBe('listening')
    s = run([{ type: 'STOP_LISTENING' }], s)
    expect(s.status).toBe('evaluating')
    s = run([answer('correct', 'voice')], s)
    expect(s).toMatchObject({ status: 'loading', currentSceneId: 's2_pay' })
    expect(s.history[0]).toEqual({ sceneId: 's1_order', branch: 'correct', source: 'voice' })
  })

  it('cancel listening returns to the choice', () => {
    const s = run([...play, { type: 'START_LISTENING' }, { type: 'CANCEL_LISTENING' }])
    expect(s.status).toBe('awaitingChoice')
  })

  it('ignores answers while the clip is still playing', () => {
    const s = run([{ type: 'CLIP_READY' }, answer('correct')])
    expect(s).toMatchObject({ status: 'playing', currentSceneId: 's1_order' })
  })

  it('replay at a choice point plays the clip again and keeps counters', () => {
    const s = run([...play, answer('unclear'), ...play, { type: 'REPLAY' }])
    expect(s).toMatchObject({ status: 'playing', currentSceneId: 's1_order', retryCount: 1 })
    expect(run([{ type: 'CLIP_ENDED' }], s).status).toBe('awaitingChoice')
  })

  it('lists clips of the possible next scenes', () => {
    expect(upcomingClips(lesson, createInitialState(lesson)).sort()).toEqual(['s1u_repeat', 's1w_drink', 's2_pay'])
    const atRepeat = run([...play, answer('unclear'), { type: 'CLIP_READY' }])
    expect(upcomingClips(lesson, atRepeat)).toEqual(['s1_order'])
  })
})

describe('restoreState', () => {
  it('resumes a choice point on its last frame', () => {
    const saved = run([...play, answer('unclear'), ...play, { type: 'START_LISTENING' }])
    const restored = restoreState(lesson, saved)
    expect(restored).toMatchObject({
      status: 'awaitingChoice',
      entry: 'resume',
      currentSceneId: 's1_order',
      retryCount: 1,
    })
    expect(restored!.entryId).toBe(saved.entryId + 1)
  })

  it('replays a scene that was playing, keeping $return working', () => {
    const saved = run([...play, answer('unclear'), { type: 'CLIP_READY' }])
    const restored = restoreState(lesson, saved)!
    expect(restored).toMatchObject({ status: 'loading', entry: 'play', currentSceneId: 's1u_repeat' })
    expect(run(play, restored)).toMatchObject({ status: 'awaitingChoice', currentSceneId: 's1_order' })
  })

  it('ignores finished runs and snapshots from another lesson version', () => {
    const ended = run([...play, answer('correct'), ...play, answer('correct'), ...play])
    expect(restoreState(lesson, ended)).toBeNull()
    expect(restoreState(lesson, { ...createInitialState(lesson), currentSceneId: 'gone' })).toBeNull()
  })
})
