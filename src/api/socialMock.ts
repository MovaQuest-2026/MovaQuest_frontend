import type { CommentsPage, LessonComment, LessonStats } from '../types/social'

// Мок соціальних функцій без бекенду (VITE_MOCK_SPEECH-подібний прапорець VITE_MOCK_SOCIAL=true, див. social.ts).
const statsMock = import.meta.glob<Record<string, LessonStats>>('../mocks/social/stats.json', { import: 'default' })
const commentsMock = import.meta.glob<Record<string, LessonComment[]>>('../mocks/social/comments.json', {
  import: 'default',
})

const EMPTY_STATS: LessonStats = { likes: 0, comments: 0, saves: 0, shares: 0 }

// Мок «бекенду»: коментарі й поширення цієї сесії. Зникають після перезавантаження.
const postedComments = new Map<string, LessonComment[]>()
const sessionShares = new Map<string, number>()

export async function mockGetLessonStats(lessonId: string): Promise<LessonStats> {
  const all = (await statsMock['../mocks/social/stats.json']?.()) ?? {}
  const base = all[lessonId] ?? EMPTY_STATS
  return {
    ...base,
    comments: base.comments + (postedComments.get(lessonId)?.length ?? 0),
    shares: base.shares + (sessionShares.get(lessonId) ?? 0),
  }
}

/** Нові коментарі першими. Мок віддає все однією сторінкою. */
export async function mockGetComments(lessonId: string): Promise<CommentsPage> {
  const all = (await commentsMock['../mocks/social/comments.json']?.()) ?? {}
  const own = postedComments.get(lessonId) ?? []
  const items = [...own, ...[...(all[lessonId] ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))]
  return { items, nextCursor: null }
}

export async function mockPostComment(lessonId: string, text: string): Promise<LessonComment> {
  const trimmed = text.trim().slice(0, 150)
  if (!trimmed) throw new Error('Empty comment')
  const comment: LessonComment = {
    id: `own-${Date.now()}`,
    author: 'You',
    text: trimmed,
    createdAt: new Date().toISOString(),
    likes: 0,
    own: true,
  }
  postedComments.set(lessonId, [comment, ...(postedComments.get(lessonId) ?? [])])
  return comment
}

export async function mockDeleteComment(lessonId: string, commentId: string): Promise<void> {
  postedComments.set(
    lessonId,
    (postedComments.get(lessonId) ?? []).filter((c) => c.id !== commentId),
  )
}

export async function mockRecordShare(lessonId: string): Promise<void> {
  sessionShares.set(lessonId, (sessionShares.get(lessonId) ?? 0) + 1)
}

/** Базові «накручені» лічильники з мок-даних (без дій цієї сесії). */
export async function seedStats(lessonId: string): Promise<LessonStats> {
  const all = (await statsMock['../mocks/social/stats.json']?.()) ?? {}
  return all[lessonId] ?? EMPTY_STATS
}

/** Мок-коментарі уроку, нові першими. */
export async function seedComments(lessonId: string): Promise<LessonComment[]> {
  const all = (await commentsMock['../mocks/social/comments.json']?.()) ?? {}
  return [...(all[lessonId] ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
