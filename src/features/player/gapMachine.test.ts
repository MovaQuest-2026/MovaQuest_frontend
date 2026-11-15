import { describe, expect, it } from 'vitest'
import type { Lesson } from '../../types/lesson'
import {
  clampSeek,
  computeOutcome,
  createInitialState,
  restoreState,
  transition,
  type MachineEvent,
  type MachineState,
} from './gapMachine'

const lesson: Lesson = {
  id: 'test',
  title: { en: 'Test', uk: 'Тест' },
  description: { en: '', uk: '' },
  targetLanguage: 'es',
  level: 'A2',
  durationSec: 20,
  cover: '',
  video: { type: 'file', src: '/clips/test/video.mp4' },
  cues: [],
  gaps: [
    {
      id: 'g1',
      kind: 'nextWord',
      pauseAt: 4,
      context: 'Un café con',
      answer: 'leche',
      translation: { en: 'milk', uk: 'молоко' },
      maxAttempts: 2,
    },
    {
      id: 'g2',
      kind: 'answer',
      pauseAt: 10,
      context: '¿De dónde eres?',
      answer: 'de Ucrania',
      accept: ['ucrania'],
      translation: { en: 'from Ukraine', uk: 'з України' },
      maxAttempts: 3,
    },
  ],
}

function run(events: MachineEvent[], from: MachineState = createInitialState()): MachineState {
  return events.reduce((s, e) => transition(lesson, s, e), from)
}

const toFirstGap: MachineEvent[] = [{ type: 'CLIP_READY' }, { type: 'TIME_UPDATE', time: 1 }, { type: 'TIME_UPDATE', time: 3.97 }]
const voice = (verdict: 'correct' | 'wrong' | 'unclear', heard = ''): MachineEvent => ({
  type: 'RESULT',
  verdict,
  heard,
  source: 'voice',
})

describe('gapMachine', () => {
  it('plays until the first gap and pauses slightly before pauseAt', () => {
    const s = run([{ type: 'CLIP_READY' }, { type: 'TIME_UPDATE', time: 3.5 }])
    expect(s.status).toBe('playing')
    expect(run(toFirstGap).status).toBe('awaitingAnswer')
  })

  it('a correct answer resolves the gap and CONTINUE moves to the next one', () => {
    let s = run([...toFirstGap, { type: 'START_LISTENING' }, { type: 'STOP_LISTENING' }, voice('correct', 'leche')])
    expect(s.status).toBe('feedback')
    expect(s.results).toEqual([{ gapId: 'g1', resolution: 'correct', attempts: 0, heard: ['leche'] }])
    s = run([{ type: 'CONTINUE' }], s)
    expect(s).toMatchObject({ status: 'playing', gapIndex: 1, attempts: 0, heard: [], lastVerdict: null })
    // Той самий час не викликає паузу вдруге.
    expect(run([{ type: 'TIME_UPDATE', time: 4 }], s).status).toBe('playing')
    expect(run([{ type: 'TIME_UPDATE', time: 10 }], s).status).toBe('awaitingAnswer')
  })

  it('a wrong answer gives another try and opens the hint', () => {
    const s = run([...toFirstGap, voice('wrong', 'azúcar')])
    expect(s).toMatchObject({ status: 'awaitingAnswer', attempts: 1, hintShown: true, lastVerdict: 'wrong' })
  })

  it('reveals the answer after maxAttempts wrong answers', () => {
    const s = run([...toFirstGap, voice('wrong', 'azúcar'), voice('wrong', 'agua')])
    expect(s.status).toBe('feedback')
    expect(s.results[0]).toEqual({ gapId: 'g1', resolution: 'revealed', attempts: 2, heard: ['azúcar', 'agua'] })
  })

  it('unclear does not cost an attempt', () => {
    const s = run([...toFirstGap, voice('unclear'), voice('unclear'), voice('unclear')])
    expect(s).toMatchObject({ status: 'awaitingAnswer', attempts: 0, lastVerdict: 'unclear', heard: [] })
  })

  it('skip resolves the gap as skipped', () => {
    const s = run([...toFirstGap, voice('wrong', 'x'), { type: 'SKIP' }])
    expect(s.status).toBe('feedback')
    expect(s.results[0]).toMatchObject({ resolution: 'skipped', attempts: 1 })
  })

  it('cancel while listening returns to the gap', () => {
    const s = run([...toFirstGap, { type: 'START_LISTENING' }, { type: 'CANCEL_LISTENING' }])
    expect(s.status).toBe('awaitingAnswer')
  })

  it('replay keeps attempts and pauses again at the same gap', () => {
    let s = run([...toFirstGap, voice('wrong', 'x'), { type: 'REPLAY' }])
    expect(s).toMatchObject({ status: 'playing', attempts: 1, gapIndex: 0 })
    s = run([{ type: 'TIME_UPDATE', time: 1 }, { type: 'TIME_UPDATE', time: 4 }], s)
    expect(s).toMatchObject({ status: 'awaitingAnswer', attempts: 1 })
  })

  it('ignores answers and skips outside a gap', () => {
    const s = run([{ type: 'CLIP_READY' }])
    expect(run([voice('correct', 'leche'), { type: 'SKIP' }, { type: 'CONTINUE' }], s)).toBe(s)
  })

  it('ends with an outcome when the clip ends after the last gap', () => {
    const s = run([
      ...toFirstGap,
      voice('correct', 'leche'),
      { type: 'CONTINUE' },
      { type: 'TIME_UPDATE', time: 10 },
      { type: 'SKIP' },
      { type: 'CONTINUE' },
      { type: 'CLIP_ENDED' },
    ])
    expect(s.status).toBe('ended')
    expect(s.outcome).toBe('partial')
    expect(run([{ type: 'CLIP_READY' }], s)).toBe(s)
  })

  it('computes outcomes', () => {
    const r = (resolution: 'correct' | 'skipped') => ({ gapId: 'g', resolution, attempts: 0, heard: [] })
    expect(computeOutcome(lesson, [r('correct'), r('correct')])).toBe('perfect')
    expect(computeOutcome(lesson, [r('correct'), r('skipped')])).toBe('partial')
    expect(computeOutcome(lesson, [r('skipped'), r('skipped')])).toBe('missed')
  })

  it('does not let the user seek past an unresolved gap', () => {
    const s = run([{ type: 'CLIP_READY' }])
    expect(clampSeek(lesson, s, 9, 20)).toBeCloseTo(3.95)
    expect(clampSeek(lesson, s, -2, 20)).toBe(0)
    const done = { ...s, gapIndex: 2 }
    expect(clampSeek(lesson, done, 19, 20)).toBe(19)
  })
})

describe('restoreState', () => {
  it('resumes a paused gap a few seconds earlier, keeping attempts', () => {
    const saved = run([...toFirstGap, voice('wrong', 'x')])
    const restored = restoreState(lesson, saved)!
    expect(restored.startAt).toBe(0)
    expect(restored.state).toMatchObject({ status: 'loading', gapIndex: 0, attempts: 1, hintShown: true })
  })

  it('resumes after a resolved gap from its pause point', () => {
    const saved = run([...toFirstGap, voice('correct', 'leche')])
    const restored = restoreState(lesson, saved)!
    expect(restored.startAt).toBe(4)
    expect(restored.state).toMatchObject({ status: 'loading', gapIndex: 1, attempts: 0 })
  })

  it('rejects finished runs and snapshots from another lesson version', () => {
    expect(restoreState(lesson, { ...createInitialState(), status: 'ended' })).toBeNull()
    expect(restoreState(lesson, { ...createInitialState(), gapIndex: 5 })).toBeNull()
    const foreign = { ...createInitialState(), results: [{ gapId: 'zzz', resolution: 'correct' as const, attempts: 0, heard: [] }] }
    expect(restoreState(lesson, foreign)).toBeNull()
  })
})
