import { describe, expect, it } from 'vitest'
import type { Lesson } from '../../types/lesson'
import {
  clampSeek,
  gapAtTime,
  wordJumpTarget,
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

  it('clamps the seek position to the video', () => {
    expect(clampSeek(9, 20)).toBe(9)
    expect(clampSeek(-2, 20)).toBe(0)
    expect(clampSeek(25, 20)).toBe(20)
  })

  it('seeking forward past unresolved gaps marks them as passed', () => {
    const s = run([{ type: 'CLIP_READY' }, { type: 'SEEK', time: 12 }])
    expect(s).toMatchObject({ status: 'playing', gapIndex: 2 })
    expect(s.results.map((r) => [r.gapId, r.resolution])).toEqual([
      ['g1', 'passed'],
      ['g2', 'passed'],
    ])
    expect(run([{ type: 'CLIP_ENDED' }], s).outcome).toBe('missed')
  })

  it('seeking forward from a pause passes only that gap and keeps its attempts', () => {
    const s = run([...toFirstGap, voice('wrong', 'agua'), { type: 'SEEK', time: 6 }])
    expect(s).toMatchObject({ status: 'playing', gapIndex: 1, attempts: 0, hintShown: false })
    expect(s.results).toEqual([{ gapId: 'g1', resolution: 'passed', attempts: 1, heard: ['agua'] }])
  })

  it('seeking backward from a pause replays the context without resolving', () => {
    const s = run([...toFirstGap, { type: 'SEEK', time: 1 }])
    expect(s).toMatchObject({ status: 'playing', gapIndex: 0, results: [] })
  })

  it('ignores seeking while listening or on the feedback screen', () => {
    const listening = run([...toFirstGap, { type: 'START_LISTENING' }])
    expect(run([{ type: 'SEEK', time: 12 }], listening)).toBe(listening)
    const feedback = run([...toFirstGap, { type: 'SKIP' }])
    expect(run([{ type: 'SEEK', time: 12 }], feedback)).toBe(feedback)
  })
})

describe('finishing right after the last word', () => {
  const answerBoth: MachineEvent[] = [
    ...toFirstGap,
    voice('correct', 'leche'),
    { type: 'CONTINUE' },
    { type: 'TIME_UPDATE', time: 9.97 },
    voice('correct', 'de Ucrania'),
    { type: 'CONTINUE' },
  ]

  it('plays the last answer for a moment, then ends without waiting for the clip to finish', () => {
    const s = run(answerBoth)
    expect(s).toMatchObject({ status: 'playing', gapIndex: 2, endAt: 12 })
    expect(run([{ type: 'TIME_UPDATE', time: 11.5 }], s).status).toBe('playing')
    const ended = run([{ type: 'TIME_UPDATE', time: 12 }], s)
    expect(ended).toMatchObject({ status: 'ended', outcome: 'perfect' })
  })

  it('does not end while a pause is still unresolved', () => {
    const s = run([...toFirstGap, voice('correct', 'leche'), { type: 'CONTINUE' }, { type: 'TIME_UPDATE', time: 30 }])
    expect(s.status).toBe('awaitingAnswer')
  })

  it('ends after retrying an earlier pause, counted from that pause, not from the end of the clip', () => {
    const passed = run([{ type: 'CLIP_READY' }, { type: 'SEEK', time: 12 }])
    expect(passed.endAt).toBe(12)
    const retried = run([{ type: 'RETRY_GAP', gapId: 'g1' }, { type: 'TIME_UPDATE', time: 3.97 }], passed)
    expect(retried.endAt).toBeNull()
    const done = run([voice('correct', 'leche'), { type: 'CONTINUE' }], retried)
    expect(done.endAt).toBe(6) // pauseAt 4 + 2
    expect(run([{ type: 'TIME_UPDATE', time: 6 }], done).status).toBe('ended')
  })
})

describe('practising a correctly answered gap', () => {
  // g1 правильно, далі нерозв'язана g2 попереду.
  const afterFirst = run([...toFirstGap, voice('correct', 'leche'), { type: 'CONTINUE' }])
  const practice = run([{ type: 'RETRY_GAP', gapId: 'g1' }, { type: 'TIME_UPDATE', time: 3.97 }], afterFirst)

  it('reopens the gap but keeps the earlier correct result', () => {
    expect(practice).toMatchObject({ status: 'awaitingAnswer', gapIndex: 0, practiceGapId: 'g1' })
    expect(practice.results).toEqual(afterFirst.results)
  })

  it('does not store a worse result: a failed practice leaves the correct one and the outcome', () => {
    const failed = run([{ type: 'SKIP' }], practice)
    expect(failed.status).toBe('feedback')
    expect(failed.practiceResult).toMatchObject({ gapId: 'g1', resolution: 'skipped' })
    expect(failed.results).toEqual(afterFirst.results)
    const back = run([{ type: 'CONTINUE' }], failed)
    expect(back).toMatchObject({ status: 'playing', gapIndex: 1, practiceGapId: null, practiceResult: null })
    expect(back.results.map((r) => [r.gapId, r.resolution])).toEqual([['g1', 'correct']])
  })

  it('shows a correct practice answer without touching the results either', () => {
    const ok = run([voice('correct', 'leche')], practice)
    expect(ok.practiceResult).toMatchObject({ resolution: 'correct' })
    expect(ok.results).toEqual(afterFirst.results)
  })

  it('can be practised again from its feedback screen', () => {
    const failed = run([{ type: 'SKIP' }], practice)
    const again = run([{ type: 'RETRY_GAP', gapId: 'g1' }], failed)
    expect(again).toMatchObject({ status: 'playing', gapIndex: 0, practiceGapId: 'g1', practiceResult: null })
  })

  it('is abandoned when the user seeks past the practised word', () => {
    const s = run([{ type: 'SEEK', time: 6 }], practice)
    expect(s).toMatchObject({ status: 'playing', gapIndex: 1, practiceGapId: null })
    expect(s.results).toEqual(afterFirst.results)
  })
})

describe('gapAtTime', () => {
  it('maps a time to the gap whose question or answer is playing', () => {
    expect(gapAtTime(lesson, 0)?.id).toBe('g1')
    expect(gapAtTime(lesson, 5)?.id).toBe('g1')
    expect(gapAtTime(lesson, 5.5)?.id).toBe('g1')
    expect(gapAtTime(lesson, 5.6)?.id).toBe('g2')
    expect(gapAtTime(lesson, 11.5)?.id).toBe('g2')
    expect(gapAtTime(lesson, 12)).toBeNull()
  })

  it('shortens the answer tail for gaps that are close together', () => {
    const close = { ...lesson, gaps: [{ ...lesson.gaps[0], pauseAt: 4 }, { ...lesson.gaps[1], pauseAt: 6.2 }] }
    expect(gapAtTime(close, 5.1)?.id).toBe('g1')
    expect(gapAtTime(close, 5.2)?.id).toBe('g2')
  })
})

describe('wordJumpTarget', () => {
  it('jumps to the context of the previous word, or to the start', () => {
    expect(wordJumpTarget(lesson, 8, 'prev')).toBe(0) // g1 pauseAt 4 → 4 - 4
    expect(wordJumpTarget(lesson, 3, 'prev')).toBe(0) // перед першою паузою: на початок
    expect(wordJumpTarget(lesson, 0.2, 'prev')).toBeNull()
    expect(wordJumpTarget(lesson, 14, 'prev')).toBe(6) // g2 pauseAt 10 → 6
  })

  it('jumps to the context of the next word, or nowhere after the last one', () => {
    expect(wordJumpTarget(lesson, 0, 'next')).toBe(6) // g2 pauseAt 10 is the first one whose context start is ahead
    expect(wordJumpTarget(lesson, 7, 'next')).toBeNull()
  })
})

describe('RETRY_GAP', () => {
  const passedBoth = run([{ type: 'CLIP_READY' }, { type: 'SEEK', time: 12 }])

  it('reopens a passed gap and removes its result', () => {
    const s = run([{ type: 'RETRY_GAP', gapId: 'g1' }], passedBoth)
    expect(s).toMatchObject({ status: 'playing', gapIndex: 0, attempts: 0 })
    expect(s.results.map((r) => r.gapId)).toEqual(['g2'])
  })

  it('after the retry continues with the first unresolved gap, not a resolved neighbour', () => {
    const retry = run([{ type: 'RETRY_GAP', gapId: 'g1' }, { type: 'TIME_UPDATE', time: 3.97 }], passedBoth)
    expect(retry.status).toBe('awaitingAnswer')
    const done = run([voice('correct', 'leche'), { type: 'CONTINUE' }], retry)
    expect(done).toMatchObject({ status: 'playing', gapIndex: 2 })
    expect(done.results.map((r) => [r.gapId, r.resolution])).toEqual([
      ['g2', 'passed'],
      ['g1', 'correct'],
    ])
  })

  it('does not count an already resolved gap twice when seeking forward', () => {
    const retry = run([{ type: 'RETRY_GAP', gapId: 'g1' }], passedBoth)
    const s = run([{ type: 'SEEK', time: 12 }], retry)
    expect(s.results.filter((r) => r.gapId === 'g2')).toHaveLength(1)
    expect(s.results.filter((r) => r.gapId === 'g1')).toHaveLength(1)
  })

  it('can retry a revealed gap right from its feedback screen', () => {
    const feedback = run([...toFirstGap, { type: 'SKIP' }])
    expect(feedback.status).toBe('feedback')
    const s = run([{ type: 'RETRY_GAP', gapId: 'g1' }], feedback)
    expect(s).toMatchObject({ status: 'playing', gapIndex: 0, attempts: 0, results: [] })
  })

  it('ignores an unknown gap and unsuitable statuses', () => {
    expect(run([{ type: 'RETRY_GAP', gapId: 'nope' }], passedBoth)).toBe(passedBoth)
    const listening = run([...toFirstGap, { type: 'START_LISTENING' }])
    expect(run([{ type: 'RETRY_GAP', gapId: 'g1' }], listening)).toBe(listening)
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
