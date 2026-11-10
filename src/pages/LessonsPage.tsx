import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getLessons } from '../api/getLessons'
import { TabBar } from '../components/TabBar'
import { localize } from '../i18n/localize'
import { useUserStore, type CompletedLesson } from '../store/useUserStore'
import type { LessonSummary } from '../types/catalog'

type LoadState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; lessons: LessonSummary[] }

export function LessonsPage() {
  const { t } = useTranslation()
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const completed = useUserStore((s) => s.completedLessons)

  useEffect(() => {
    let cancelled = false
    getLessons()
      .then((lessons) => !cancelled && setLoad({ status: 'ready', lessons }))
      .catch(() => !cancelled && setLoad({ status: 'error' }))
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <main className="page page--with-tabbar">
        <header className="stack">
          <h1 className="page__title">{t('lessons.title')}</h1>
          <p className="page__subtitle">{t('lessons.subtitle')}</p>
        </header>

        {load.status === 'loading' && <p className="muted">{t('app.loading')}</p>}
        {load.status === 'error' && <p className="notice notice--error">{t('app.error')}</p>}
        {load.status === 'ready' && load.lessons.length === 0 && <p className="muted">{t('lessons.empty')}</p>}
        {load.status === 'ready' && load.lessons.length > 0 && (
          <ul className="lesson-list">
            {load.lessons.map((lesson) => (
              <li key={lesson.id}>
                <LessonCard lesson={lesson} result={completed[lesson.id]} />
              </li>
            ))}
          </ul>
        )}
      </main>
      <TabBar />
    </>
  )
}

interface LessonCardProps {
  lesson: LessonSummary
  result?: CompletedLesson
}

function LessonCard({ lesson, result }: LessonCardProps) {
  const { t } = useTranslation()
  const lang = useUserStore((s) => s.interfaceLanguage)
  const [coverFailed, setCoverFailed] = useState(false)

  const body = (
    <>
      {coverFailed ? (
        <div className="lesson-card__cover" aria-hidden="true" />
      ) : (
        <img
          className="lesson-card__cover"
          src={lesson.cover}
          alt=""
          loading="lazy"
          onError={() => setCoverFailed(true)}
        />
      )}
      <div className="lesson-card__body">
        <h2 className="lesson-card__title">{localize(lesson.title, lang)}</h2>
        <p className="lesson-card__desc">{localize(lesson.description, lang)}</p>
        <div className="lesson-card__meta">
          <span className="badge">{lesson.level}</span>
          {lesson.durationSec !== undefined && <span className="badge">{formatDuration(lesson.durationSec, t)}</span>}
          <StatusBadge lesson={lesson} result={result} />
        </div>
      </div>
    </>
  )

  if (lesson.comingSoon) {
    return (
      <div className="lesson-card lesson-card--disabled" aria-disabled="true">
        {body}
      </div>
    )
  }
  return (
    <Link className="lesson-card" to={`/lesson/${lesson.id}`}>
      {body}
    </Link>
  )
}

function StatusBadge({ lesson, result }: LessonCardProps) {
  const { t } = useTranslation()
  if (lesson.comingSoon) return <span className="badge">{t('lessons.status.comingSoon')}</span>
  if (result) {
    return (
      <span className={`badge badge--${result.outcome}`}>
        {t('lessons.status.completed')} · {t(`outcome.${result.outcome}`)}
      </span>
    )
  }
  return <span className="badge badge--new">{t('lessons.status.new')}</span>
}

function formatDuration(sec: number, t: (key: string, opts?: Record<string, unknown>) => string): string {
  return sec >= 60 ? t('lessons.duration', { minutes: Math.round(sec / 60) }) : t('lessons.durationSec', { seconds: sec })
}
