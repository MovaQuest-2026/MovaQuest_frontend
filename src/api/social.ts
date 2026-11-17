import type { CommentsPage, LessonComment, LessonStats, MyReactions } from '../types/social'
import { apiFetch } from './http'
import {
  mockDeleteComment,
  mockGetComments,
  mockGetLessonStats,
  mockPostComment,
  mockRecordShare,
  seedComments,
  seedStats,
} from './socialMock'

// Лайки, збереження, лічильники, коментарі й поширення: бекенд (/api/v1, див. Swagger).
//   GET  /me/reactions                         → { liked: [lessonId], saved: [lessonId] }  (потрібна сесія)
//   PUT/DELETE /lessons/:id/like, /save        → 204, ідемпотентно                           (потрібна сесія)
//   GET  /lessons/:id/stats                    → { likes, comments, saves, shares }          (відкрито, містить і дії самого користувача)
//   GET  /lessons/:id/comments?cursor&limit    → { items, nextCursor }                       (відкрито)
//   POST /lessons/:id/comments { text }        → коментар; DELETE /comments/:id              (свій)
//   POST /lessons/:id/share { method }         → 204
// Лайк, збереження і коментар доступні лише з акаунта (інтерфейс відправляє гостя на /auth).
// VITE_MOCK_SOCIAL=true вмикає мок без бекенду (src/api/socialMock.ts).

const MOCK = import.meta.env.VITE_MOCK_SOCIAL === 'true'
// «Накрутка»: до справжніх лічильників і коментарів додаємо мок-базу з src/mocks/social, щоб стрічка не була порожньою.
// VITE_SOCIAL_SEED=false вимикає її (лише справжні дані бекенду).
const SEED = !MOCK && import.meta.env.VITE_SOCIAL_SEED !== 'false'

export const COMMENT_MAX_LENGTH = 150
const COMMENTS_PAGE_SIZE = 20

interface ServerComment {
  id: string
  author: string
  text: string
  createdAt: string
  likes?: number
  own?: boolean
}

const toComment = (c: ServerComment): LessonComment => ({
  id: String(c.id),
  author: c.author,
  text: c.text,
  createdAt: c.createdAt,
  likes: c.likes ?? 0,
  own: c.own ?? false,
})

const lessonPath = (lessonId: string) => `/lessons/${encodeURIComponent(lessonId)}`

// Останні відомі лічильники уроку: стрічка дістає їх наперед для сусідніх відео, щоб після свайпу не миготіли нулі.
const statsCache = new Map<string, LessonStats>()
const statsInFlight = new Set<string>()

/** Лічильники з кешу, якщо вони вже завантажені (без запиту). */
export function peekLessonStats(lessonId: string): LessonStats | null {
  return statsCache.get(lessonId) ?? null
}

/** Завантажує лічильники в кеш у фоні (для сусідніх уроків стрічки). Помилки ігноруємо. */
export function prefetchLessonStats(lessonId: string | null): void {
  if (!lessonId || statsCache.has(lessonId) || statsInFlight.has(lessonId)) return
  statsInFlight.add(lessonId)
  getLessonStats(lessonId)
    .catch(() => {})
    .finally(() => statsInFlight.delete(lessonId))
}

export async function getLessonStats(lessonId: string): Promise<LessonStats> {
  const stats = await fetchLessonStats(lessonId)
  statsCache.set(lessonId, stats)
  return stats
}

async function fetchLessonStats(lessonId: string): Promise<LessonStats> {
  if (MOCK) return mockGetLessonStats(lessonId)
  const real = await apiFetch<LessonStats>(`${lessonPath(lessonId)}/stats`)
  if (!SEED) return real
  const seed = await seedStats(lessonId)
  return {
    likes: real.likes + seed.likes,
    comments: real.comments + seed.comments,
    saves: real.saves + seed.saves,
    shares: real.shares + seed.shares,
  }
}

/** Нові коментарі першими. `cursor` береться з попередньої сторінки. */
export async function getComments(lessonId: string, cursor?: string | null): Promise<CommentsPage> {
  if (MOCK) return mockGetComments(lessonId)
  const query = new URLSearchParams({ limit: String(COMMENTS_PAGE_SIZE) })
  if (cursor) query.set('cursor', cursor)
  const page = await apiFetch<{ items: ServerComment[]; nextCursor: string | null }>(
    `${lessonPath(lessonId)}/comments?${query}`,
  )
  const items = page.items.map(toComment)
  const nextCursor = page.nextCursor ?? null
  // Мок-коментарі йдуть після справжніх: на останній сторінці.
  if (SEED && nextCursor === null) items.push(...(await seedComments(lessonId)))
  return { items, nextCursor }
}

/** Лише для акаунта: без сесії бекенд відповідає 401 (ApiError). */
export async function postComment(lessonId: string, text: string): Promise<LessonComment> {
  const trimmed = text.trim().slice(0, COMMENT_MAX_LENGTH)
  if (!trimmed) throw new Error('Empty comment')
  if (MOCK) return mockPostComment(lessonId, trimmed)
  const created = await apiFetch<ServerComment>(`${lessonPath(lessonId)}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: trimmed }),
  })
  return toComment(created)
}

/** Видаляє свій коментар. */
export async function deleteComment(lessonId: string, commentId: string): Promise<void> {
  if (MOCK) return mockDeleteComment(lessonId, commentId)
  await apiFetch<null>(`/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' })
}

/** Лайки й збережені уроки акаунта; 401 без сесії. */
export async function getMyReactions(): Promise<MyReactions> {
  const r = await apiFetch<MyReactions>('/me/reactions')
  return { liked: r.liked ?? [], saved: r.saved ?? [] }
}

/** Лайк і збереження живуть у useUserStore; сюди приходять лише для акаунта, щоб синхронізувати з бекендом. */
export async function setLessonLiked(lessonId: string, liked: boolean): Promise<void> {
  if (MOCK) return
  await apiFetch<null>(`${lessonPath(lessonId)}/like`, { method: liked ? 'PUT' : 'DELETE' })
}

export async function setLessonSaved(lessonId: string, saved: boolean): Promise<void> {
  if (MOCK) return
  await apiFetch<null>(`${lessonPath(lessonId)}/save`, { method: saved ? 'PUT' : 'DELETE' })
}

/** Лічильник поширень: помилка не заважає самому поширенню, тож її ковтаємо. */
export async function recordShare(lessonId: string, method: 'native' | 'copy'): Promise<void> {
  if (MOCK) return mockRecordShare(lessonId)
  try {
    await apiFetch<null>(`${lessonPath(lessonId)}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method }),
    })
  } catch {
    // Лічильник не критичний.
  }
}
