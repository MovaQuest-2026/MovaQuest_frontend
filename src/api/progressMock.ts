import type { ActiveLesson, CompletedLesson, Progress } from '../types/progress'
import { emptyProgress, mergeProgress } from '../types/progress'
import { readTable, writeTable } from './mockDb'

// Мок /me/progress у localStorage (VITE_MOCK_PROGRESS=true): «таблиці» lesson_results, learned_words, active_lessons
// з тими самими правилами, що на сервері (§6.2).

interface ResultRow extends CompletedLesson {
  accountId: string
  lessonId: string
}
interface WordRow {
  accountId: string
  lessonId: string
  gapId: string
}
interface ActiveRow extends ActiveLesson {
  accountId: string
  lessonId: string
}

const others = <T extends { accountId: string }>(table: string, accountId: string) =>
  readTable<T>(table).filter((r) => r.accountId !== accountId)

export async function mockGetProgress(accountId: string): Promise<Progress> {
  const progress = emptyProgress()
  for (const r of readTable<ResultRow>('lesson_results')) {
    if (r.accountId !== accountId) continue
    const { outcome, correct, total, completedAt } = r
    progress.completedLessons[r.lessonId] = { outcome, correct, total, completedAt }
  }
  for (const r of readTable<WordRow>('learned_words')) {
    if (r.accountId === accountId) (progress.learnedWords[r.lessonId] ??= []).push(r.gapId)
  }
  for (const r of readTable<ActiveRow>('active_lessons')) {
    if (r.accountId === accountId) progress.activeLessons[r.lessonId] = { machine: r.machine, updatedAt: r.updatedAt }
  }
  return progress
}

function writeProgress(accountId: string, progress: Progress) {
  writeTable<ResultRow>('lesson_results', [
    ...others<ResultRow>('lesson_results', accountId),
    ...Object.entries(progress.completedLessons).map(([lessonId, r]) => ({ accountId, lessonId, ...r })),
  ])
  writeTable<WordRow>('learned_words', [
    ...others<WordRow>('learned_words', accountId),
    ...Object.entries(progress.learnedWords).flatMap(([lessonId, gaps]) => gaps.map((gapId) => ({ accountId, lessonId, gapId }))),
  ])
  writeTable<ActiveRow>('active_lessons', [
    ...others<ActiveRow>('active_lessons', accountId),
    ...Object.entries(progress.activeLessons).map(([lessonId, a]) => ({ accountId, lessonId, ...a })),
  ])
}

export async function mockImportProgress(accountId: string, local: Progress): Promise<Progress> {
  const merged = mergeProgress(await mockGetProgress(accountId), local)
  writeProgress(accountId, merged)
  return merged
}

export async function mockSaveLessonResult(accountId: string, lessonId: string, result: CompletedLesson): Promise<CompletedLesson> {
  const current = await mockGetProgress(accountId)
  const merged = mergeProgress(current, { ...emptyProgress(), completedLessons: { [lessonId]: result } })
  // Завершення уроку прибирає його незавершений знімок.
  delete merged.activeLessons[lessonId]
  writeProgress(accountId, merged)
  return merged.completedLessons[lessonId]
}

export async function mockMarkWordsLearned(accountId: string, items: { lessonId: string; gapId: string }[]): Promise<void> {
  const learnedWords: Record<string, string[]> = {}
  for (const { lessonId, gapId } of items) (learnedWords[lessonId] ??= []).push(gapId)
  writeProgress(accountId, mergeProgress(await mockGetProgress(accountId), { ...emptyProgress(), learnedWords }))
}

export async function mockSaveActiveLesson(accountId: string, lessonId: string, active: ActiveLesson): Promise<ActiveLesson> {
  const merged = mergeProgress(await mockGetProgress(accountId), { ...emptyProgress(), activeLessons: { [lessonId]: active } })
  writeProgress(accountId, merged)
  return merged.activeLessons[lessonId] ?? active
}

export async function mockClearActiveLesson(accountId: string, lessonId: string): Promise<void> {
  const current = await mockGetProgress(accountId)
  delete current.activeLessons[lessonId]
  writeProgress(accountId, current)
}

export async function mockResetProgress(accountId: string): Promise<void> {
  writeProgress(accountId, emptyProgress())
}
