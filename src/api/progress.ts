import type { ActiveLesson, CompletedLesson, Progress } from '../types/progress'
import { apiFetch } from './http'
import {
  mockClearActiveLesson,
  mockGetProgress,
  mockImportProgress,
  mockMarkWordsLearned,
  mockResetProgress,
  mockSaveActiveLesson,
  mockSaveLessonResult,
} from './progressMock'

// Прогрес акаунта на бекенді (/api/v1/me/progress, docs/backend-requirements.md §6.3). Усе вимагає сесію (гість: 401).
//   GET    /me/progress                        → Progress
//   PUT    /me/progress/lessons/:lessonId      { outcome, correct, total, completedAt } → збережений (кращий) результат
//   POST   /me/progress/words                  { items: [{ lessonId, gapId }] } → 204, ідемпотентно
//   PUT    /me/progress/active/:lessonId       { machine, updatedAt } → те, що лежить на сервері (пізніший перемагає)
//   DELETE /me/progress/active/:lessonId       → 204
//   POST   /me/progress/import                 Progress → Progress (злиття)
//   DELETE /me/progress                        → 204 («Скинути прогрес»)
// accountId потрібен лише моку (VITE_MOCK_PROGRESS=true): сервер бере акаунт із сесії.
// `keepalive` для запитів, які йдуть, коли вкладку ховають.

const MOCK = import.meta.env.VITE_MOCK_PROGRESS === 'true'

/** Сервер приймає до 500 слів за запит. */
const WORDS_BATCH = 500

const json = (method: string, body: unknown, keepalive = false): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
  keepalive,
})

const lessonPath = (kind: 'lessons' | 'active', lessonId: string) => `/me/progress/${kind}/${encodeURIComponent(lessonId)}`

export async function getProgress(accountId: string): Promise<Progress> {
  if (MOCK) return mockGetProgress(accountId)
  return apiFetch<Progress>('/me/progress')
}

/** Надсилає все локальне й повертає об'єднаний прогрес (вхід, запуск, повернення мережі). */
export async function importProgress(accountId: string, local: Progress): Promise<Progress> {
  if (MOCK) return mockImportProgress(accountId, local)
  return apiFetch<Progress>('/me/progress/import', json('POST', local))
}

/** Результат проходження. Відповідь — кращий із збереженого й надісланого. */
export async function saveLessonResult(accountId: string, lessonId: string, result: CompletedLesson): Promise<CompletedLesson> {
  if (MOCK) return mockSaveLessonResult(accountId, lessonId, result)
  const { outcome, correct, total, completedAt } = result
  return apiFetch<CompletedLesson>(lessonPath('lessons', lessonId), json('PUT', { outcome, correct, total, completedAt }))
}

export async function markWordsLearned(
  accountId: string,
  items: { lessonId: string; gapId: string }[],
  keepalive = false,
): Promise<void> {
  if (items.length === 0) return
  if (MOCK) return mockMarkWordsLearned(accountId, items)
  for (let i = 0; i < items.length; i += WORDS_BATCH) {
    await apiFetch<null>('/me/progress/words', json('POST', { items: items.slice(i, i + WORDS_BATCH) }, keepalive))
  }
}

/** Знімок незавершеного уроку. Відповідь — те, що лежить на сервері (може бути новішим з іншого пристрою). */
export async function saveActiveLesson(
  accountId: string,
  lessonId: string,
  active: ActiveLesson,
  keepalive = false,
): Promise<ActiveLesson> {
  if (MOCK) return mockSaveActiveLesson(accountId, lessonId, active)
  const { machine, updatedAt } = active
  return apiFetch<ActiveLesson>(lessonPath('active', lessonId), json('PUT', { machine, updatedAt }, keepalive))
}

export async function clearActiveLesson(accountId: string, lessonId: string): Promise<void> {
  if (MOCK) return mockClearActiveLesson(accountId, lessonId)
  await apiFetch<null>(lessonPath('active', lessonId), { method: 'DELETE' })
}

/** «Скинути прогрес» на сервері. Локально чистити лише після успіху, інакше import поверне дані. */
export async function resetProgressRemote(accountId: string): Promise<void> {
  if (MOCK) return mockResetProgress(accountId)
  await apiFetch<null>('/me/progress', { method: 'DELETE' })
}
