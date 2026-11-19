import { useEffect, useState } from 'react'
import { getLessons } from '../../api/getLessons'

export type FeedDirection = 'next' | 'prev'

/** Сусідні уроки в стрічці (порядок каталогу, без «coming soon»). Стрічка йде по колу: після останнього знову перший. */
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
  if (index < 0 || ids.length < 2) return { next: null, prev: null }
  return {
    next: ids[(index + 1) % ids.length],
    prev: ids[(index - 1 + ids.length) % ids.length],
  }
}
