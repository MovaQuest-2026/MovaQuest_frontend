import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getLatestLessonId } from '../api/getLessons'

/** /app і /lesson: одразу відкриває найновіше додане відео. */
export function LatestLessonPage() {
  const { t } = useTranslation()
  const [target, setTarget] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getLatestLessonId()
      .then((id) => !cancelled && setTarget(id ? `/lesson/${id}` : '/lessons'))
      .catch(() => !cancelled && setTarget('/lessons'))
    return () => {
      cancelled = true
    }
  }, [])

  if (target) return <Navigate to={target} replace />
  return <main className="player player--loading">{t('app.loading')}</main>
}
