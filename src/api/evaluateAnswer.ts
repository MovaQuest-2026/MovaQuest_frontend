import { matchAnswer, type Verdict } from '../lib/matchAnswer'
import type { Gap } from '../types/lesson'
import { getForcedVerdict } from './devOverrides'
import { getLesson } from './getLesson'

export interface EvaluateResult {
  verdict: Verdict
  /** Що розпізнано (нормалізований текст). */
  transcript: string
  confidence: number
}

/*
 * Майбутній контракт (бекенд):
 *   POST {API_URL}/api/speech/evaluate
 *   Content-Type: multipart/form-data; поля lessonId, gapId, audio (Blob з MediaRecorder)
 *   Відповідь 200: EvaluateResult
 *
 * На сервері: STT з мовою es-ES, потім matchAnswer(transcript, [gap.answer, ...gap.accept]).
 * Confidence STT нижче 0.5 дає 'unclear'.
 *
 * Зараз це мок: аудіо нікуди не надсилається, не зберігається і не логується.
 */
export async function evaluateAnswer(lessonId: string, gapId: string, audio: Blob): Promise<EvaluateResult> {
  await delay(700 + Math.random() * 600)
  const gap = await findGap(lessonId, gapId)
  const forced = getForcedVerdict()
  const pretend: Verdict = forced ?? (audio.size < 4096 ? 'unclear' : pickRandomVerdict())
  const transcript = pretend === 'correct' ? gap.answer : pretend === 'wrong' ? WRONG_GUESSES[Math.floor(Math.random() * WRONG_GUESSES.length)] : ''
  const verdict = matchAnswer(transcript, expectedAnswers(gap))
  const confidence = verdict === 'unclear' ? 0.2 + Math.random() * 0.25 : 0.75 + Math.random() * 0.2
  return { verdict, transcript, confidence }
}

/** Перевірка набраної відповіді. Локально, без мережі. */
export function evaluateTypedAnswer(gap: Gap, text: string): Verdict {
  return matchAnswer(text, expectedAnswers(gap))
}

export function expectedAnswers(gap: Gap): string[] {
  return [gap.answer, ...(gap.accept ?? [])]
}

const WRONG_GUESSES = ['bueno', 'vale', 'pues', 'mesa', 'nada']

function pickRandomVerdict(): Verdict {
  const r = Math.random()
  if (r < 0.6) return 'correct'
  if (r < 0.9) return 'wrong'
  return 'unclear'
}

async function findGap(lessonId: string, gapId: string): Promise<Gap> {
  const lesson = await getLesson(lessonId)
  const gap = lesson.gaps.find((g) => g.id === gapId)
  if (!gap) throw new Error(`Unknown gap "${gapId}" in lesson "${lessonId}"`)
  return gap
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
