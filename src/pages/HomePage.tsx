import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getLessons } from '../api/getLessons'
import { useUserStore } from '../store/useUserStore'

// «Головна»: одразу відкриває останній незавершений урок, а якщо його немає — перший урок стрічки.
export function HomePage() {
  const { t } = useTranslation()
  const activeLessonId = useUserStore((s) => s.activeLesson?.lessonId)
  const [target, setTarget] = useState<string | null>(null)

  useEffect(() => {
    if (activeLessonId) return
    let cancelled = false
    getLessons()
      .then((list) => {
        if (cancelled) return
        const first = list.find((l) => !l.comingSoon)
        setTarget(first ? `/lesson/${first.id}` : '/lessons')
      })
      .catch(() => !cancelled && setTarget('/lessons'))
    return () => {
      cancelled = true
    }
  }, [activeLessonId])

  if (activeLessonId) return <Navigate to={`/lesson/${activeLessonId}`} replace />
  if (target) return <Navigate to={target} replace />
  return <main className="player player--loading">{t('app.loading')}</main>
}
