import type { BranchKind } from '../types/lesson'
import { getForcedBranch } from './devOverrides'
import { getLesson } from './getLesson'

export interface EvaluateResult {
  branch: 'correct' | 'wrong' | 'unclear'
  transcript: string
  confidence: number
}

/*
 * Майбутній контракт (бекенд):
 *   POST {API_URL}/api/speech/evaluate
 *   Content-Type: multipart/form-data; поля lessonId, sceneId, audio (Blob з MediaRecorder)
 *   Відповідь 200: EvaluateResult
 *
 * На сервері: STT з мовою es-ES. Транскрипт нормалізується (нижній регістр,
 * без пунктуації й діакритики) і порівнюється з phrases[].es та phrases[].accept[]
 * поточної сцени. Найближча фраза дає branch; confidence нижче 0.5 дає 'unclear'.
 *
 * Зараз це мок: аудіо нікуди не надсилається, не зберігається і не логується.
 */
export async function evaluateSpeech(lessonId: string, sceneId: string, audio: Blob): Promise<EvaluateResult> {
  await delay(800 + Math.random() * 700)

  const forced = getForcedBranch()
  const branch: BranchKind = forced ?? (audio.size < 4096 ? 'unclear' : pickRandomBranch())
  const transcript = await mockTranscript(lessonId, sceneId, branch)
  const confidence = branch === 'unclear' ? 0.2 + Math.random() * 0.25 : 0.75 + Math.random() * 0.2
  return { branch, transcript, confidence }
}

function pickRandomBranch(): BranchKind {
  const r = Math.random()
  if (r < 0.5) return 'correct'
  if (r < 0.8) return 'wrong'
  return 'unclear'
}

async function mockTranscript(lessonId: string, sceneId: string, branch: BranchKind): Promise<string> {
  try {
    const lesson = await getLesson(lessonId)
    const phrase = lesson.scenes.find((s) => s.id === sceneId)?.choice?.phrases.find((p) => p.branch === branch)
    return phrase ? normalize(phrase.es) : ''
  } catch {
    return ''
  }
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
