import { matchAnswer, type Verdict } from '../lib/matchAnswer'
import type { Gap } from '../types/lesson'
import { ApiError, apiFetch } from './http'
import { getForcedVerdict } from './devOverrides'
import { getLesson } from './getLesson'

export interface EvaluateResult {
  verdict: Verdict
  /** Що розпізнано (нормалізований текст). */
  transcript: string
  confidence: number
}

/** Відповідь `POST /api/v1/transcription` (Deepgram Nova-3, мова es на бекенді). */
interface TranscriptionResponse {
  transcript: string
  confidence: number | null
  is_silent: boolean
  duration_seconds: number | null
  model: string
  language: string
}

/** STT із впевненістю нижче цього порога не вважаємо відповіддю. */
const MIN_CONFIDENCE = 0.5

/** Голос недоступний: бекенд вимагає сесію (401; на MVP ендпоінт відкритий, але це може повернутися). */
export class SpeechError extends Error {
  readonly code: 'signInRequired' | 'unavailable'
  constructor(code: 'signInRequired' | 'unavailable') {
    super(code)
    this.code = code
  }
}

/** VITE_MOCK_SPEECH=true: розпізнавання-мок без бекенду (для розробки без акаунта). */
export const MOCK_SPEECH = import.meta.env.VITE_MOCK_SPEECH === 'true'

/**
 * Розпізнавання голосу: POST /api/v1/transcription (multipart: `audio`, повторюване поле `hint`).
 * Бекенд віддає лише транскрипт, а вердикт рахуємо тут через matchAnswer. На MVP ендпоінт відкритий для гостей;
 * якщо бекенд знову вимагатиме сесію (401), кидаємо SpeechError('signInRequired'): інтерфейс запропонує увійти або ввести текстом.
 * Аудіо ніде не зберігаємо й не логуємо.
 */
export async function evaluateAnswer(lessonId: string, gapId: string, audio: Blob): Promise<EvaluateResult> {
  if (MOCK_SPEECH) return evaluateMock(lessonId, gapId, audio)

  const gap = await findGap(lessonId, gapId)
  const expected = expectedAnswers(gap)
  const body = new FormData()
  body.append('audio', audio, `answer.${audioExtension(audio.type)}`)
  for (const hint of expected) body.append('hint', hint)

  let res: TranscriptionResponse
  try {
    res = await apiFetch<TranscriptionResponse>('/transcription', { method: 'POST', body })
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) throw new SpeechError('signInRequired')
    throw err
  }

  const transcript = res.transcript.trim()
  const confidence = res.confidence ?? (transcript ? 1 : 0)
  if (res.is_silent || !transcript) return { verdict: 'unclear', transcript: '', confidence }
  const verdict = matchAnswer(transcript, expected)
  // Невпевнене розпізнавання не рахуємо за помилку користувача.
  return { verdict: verdict === 'wrong' && confidence < MIN_CONFIDENCE ? 'unclear' : verdict, transcript, confidence }
}

function audioExtension(mime: string): string {
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('ogg')) return 'ogg'
  if (mime.includes('mp4') || mime.includes('aac')) return 'mp4'
  if (mime.includes('wav')) return 'wav'
  return 'webm'
}

/** Мок для розробки: аудіо нікуди не надсилається. */
async function evaluateMock(lessonId: string, gapId: string, audio: Blob): Promise<EvaluateResult> {
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
