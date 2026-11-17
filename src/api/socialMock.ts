import type { LessonComment, LessonStats } from '../types/social'

// Зараз читає моки. Пізніше:
//   GET  /api/lessons/:id/stats
//   GET  /api/lessons/:id/comments, POST /api/lessons/:id/comments
//   PUT/DELETE /api/lessons/:id/like, /save; POST /api/lessons/:id/share
const statsMock = import.meta.glob<Record<string, LessonStats>>('../mocks/social/stats.json', { import: 'default' })
const commentsMock = import.meta.glob<Record<string, LessonComment[]>>('../mocks/social/comments.json', {
  import: 'default',
})

const EMPTY_STATS: LessonStats = { likes: 0, comments: 0, saves: 0, shares: 0 }

// Мок «бекенду»: коментарі й поширення цієї сесії. Зникають після перезавантаження.
const postedComments = new Map<string, LessonComment[]>()
const sessionShares = new Map<string, number>()

export async function getLessonStats(lessonId: string): Promise<LessonStats> {
  const all = (await statsMock['../mocks/social/stats.json']?.()) ?? {}
  const base = all[lessonId] ?? EMPTY_STATS
  return {
    ...base,
    comments: base.comments + (postedComments.get(lessonId)?.length ?? 0),
    shares: base.shares + (sessionShares.get(lessonId) ?? 0),
  }
}

/** Нові коментарі першими. */
export async function getComments(lessonId: string): Promise<LessonComment[]> {
  const all = (await commentsMock['../mocks/social/comments.json']?.()) ?? {}
  const own = postedComments.get(lessonId) ?? []
  return [...own, ...[...(all[lessonId] ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))]
}

export const COMMENT_MAX_LENGTH = 150

export async function postComment(lessonId: string, author: string, text: string): Promise<LessonComment> {
  const trimmed = text.trim().slice(0, COMMENT_MAX_LENGTH)
  if (!trimmed) throw new Error('Empty comment')
  const comment: LessonComment = {
    id: `own-${Date.now()}`,
    author,
    text: trimmed,
    createdAt: new Date().toISOString(),
    likes: 0,
    own: true,
  }
  postedComments.set(lessonId, [comment, ...(postedComments.get(lessonId) ?? [])])
  return comment
}

/** Лайк і збереження живуть у useUserStore; тут лише синхронізація з бекендом (зараз нічого не робить). */
export async function setLessonLiked(_lessonId: string, _liked: boolean): Promise<void> {}
export async function setLessonSaved(_lessonId: string, _saved: boolean): Promise<void> {}

export async function recordShare(lessonId: string): Promise<void> {
  sessionShares.set(lessonId, (sessionShares.get(lessonId) ?? 0) + 1)
}
