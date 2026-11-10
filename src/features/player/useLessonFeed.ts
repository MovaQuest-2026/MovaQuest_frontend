import { useEffect, useState } from 'react'
import { getLessons } from '../../api/getLessons'

export type FeedDirection = 'next' | 'prev'

/** Сусідні уроки в стрічці (порядок каталогу, без «coming soon»). */
export function useLessonFeed(lessonId: string) {
  const [ids, setIds] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    getLessons()
      .then((list) => !cancelled && setIds(list.filter((l) => !l.comingSoon).map((l) => l.id)))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const index = ids.indexOf(lessonId)
  return {
    next: index >= 0 ? (ids[index + 1] ?? null) : null,
    prev: index > 0 ? ids[index - 1] : null,
  }
}
