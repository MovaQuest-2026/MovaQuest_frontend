import { useEffect } from 'react'
import { getMyReactions, setLessonLiked, setLessonSaved } from '../../api/social'
import { useUserStore } from '../../store/useUserStore'

const union = (a: string[], b: string[]) => [...new Set([...a, ...b])]

/**
 * Після входу (і під час запуску з уже наявною сесією) звіряє лайки й збереження з бекендом:
 * те, що гість встиг лайкнути на пристрої, надсилається на сервер, а в сховищі стає об'єднання обох списків.
 * Мережеві збої ігноруємо: лишається локальний стан.
 */
export async function syncReactions(accountId: string): Promise<void> {
  let remote
  try {
    remote = await getMyReactions()
  } catch {
    return
  }
  const { likedLessons, savedLessons, account } = useUserStore.getState()
  if (account?.id !== accountId) return
  const localOnlyLikes = likedLessons.filter((id) => !remote.liked.includes(id))
  const localOnlySaves = savedLessons.filter((id) => !remote.saved.includes(id))
  await Promise.allSettled([
    ...localOnlyLikes.map((id) => setLessonLiked(id, true)),
    ...localOnlySaves.map((id) => setLessonSaved(id, true)),
  ])
  const current = useUserStore.getState()
  if (current.account?.id !== accountId) return
  useUserStore.getState().setReactions(
    union(remote.liked, current.likedLessons),
    union(remote.saved, current.savedLessons),
  )
}

export function useReactionsSync() {
  useEffect(() => {
    let syncedFor: string | null = null
    const check = (accountId: string | null) => {
      if (!accountId) {
        syncedFor = null
        return
      }
      if (accountId === syncedFor) return
      syncedFor = accountId
      void syncReactions(accountId)
    }
    check(useUserStore.getState().account?.id ?? null)
    return useUserStore.subscribe((s, prev) => {
      if (s.account?.id !== prev.account?.id) check(s.account?.id ?? null)
    })
  }, [])
}
