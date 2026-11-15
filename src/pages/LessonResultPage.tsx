import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getLesson } from '../api/getLesson'
import type { GapResult } from '../features/player/gapMachine'
import { useLessonFeed } from '../features/player/useLessonFeed'
import { localize, translate } from '../i18n/localize'
import { usePlayerStore } from '../store/usePlayerStore'
import { useUserStore } from '../store/useUserStore'
import type { Lesson } from '../types/lesson'

export function LessonResultPage() {
  const { lessonId = '' } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const lang = useUserStore((s) => s.interfaceLanguage)
  const saved = useUserStore((s) => s.completedLessons[lessonId])
  const lastResult = usePlayerStore((s) => (s.lastResult?.lessonId === lessonId ? s.lastResult : null))
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const feed = useLessonFeed(lessonId)

  useEffect(() => {
    let cancelled = false
    getLesson(lessonId)
      .then((l) => !cancelled && setLesson(l))
      .catch(() => !cancelled && navigate('/lessons', { replace: true }))
    return () => {
      cancelled = true
    }
  }, [lessonId, navigate])

  const outcome = lastResult?.outcome ?? saved?.outcome

  if (!lesson) return <main className="page player--loading">{t('app.loading')}</main>

  if (!outcome) {
    return (
      <main className="page">
        <h1 className="page__title">{localize(lesson.title, lang)}</h1>
        <p className="page__subtitle">{t('result.noResult')}</p>
        <Link className="btn btn--primary btn--block" to={`/lesson/${lessonId}`}>
          {t('result.startLesson')}
        </Link>
        <Link className="btn btn--block" to="/lessons">
          {t('result.backToLessons')}
        </Link>
      </main>
    )
  }

  const results = lastResult?.results
  const correct = results ? results.filter((r) => r.resolution === 'correct').length : saved?.correct
  const total = lesson.gaps.length

  return (
    <main className="page">
      <header className={`result-hero result-hero--${outcome}`}>
        <h1 className="page__title">{t(`result.outcomes.${outcome}.title`)}</h1>
        <p className="page__subtitle">{t(`result.outcomes.${outcome}.body`)}</p>
        {correct !== undefined && <p className="stat">{t('result.score', { correct, total })}</p>}
        <p className="muted">{localize(lesson.title, lang)}</p>
      </header>

      <section className="stack">
        <h2 className="section-title">{t('result.words')}</h2>
        <ul className="result-list">
          {lesson.gaps.map((gap) => {
            const r = results?.find((x) => x.gapId === gap.id)
            return (
              <li key={gap.id} className="card stack">
                <p className="result-list__quote" lang="es">
                  {gap.context} <strong className="result-list__answer">{gap.answer}</strong>
                </p>
                {translate(gap.translation, lang) && (
                  <p className="phrase-card__tr">{translate(gap.translation, lang)}</p>
                )}
                {r && (
                  <div className="row">
                    <span className={`badge badge--${badgeTone(r)}`}>{resolutionLabel(r, t)}</span>
                    {r.heard.length > 0 && r.resolution !== 'correct' && (
                      <span className="muted" lang="es">
                        {t('result.youSaid', { heard: r.heard.join(', ') })}
                      </span>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <div className="stack">
        {feed.next && (
          <button
            type="button"
            className="btn btn--primary btn--block"
            onClick={() => navigate(`/lesson/${feed.next}`, { replace: true, state: { enter: 'next' } })}
          >
            {t('result.nextLesson')}
          </button>
        )}
        <button
          type="button"
          className={`btn btn--block${feed.next ? '' : ' btn--primary'}`}
          onClick={() => navigate(`/lesson/${lessonId}`, { replace: true })}
        >
          {t('result.tryAgain')}
        </button>
        <Link className="btn btn--block" to="/lessons">
          {t('result.backToLessons')}
        </Link>
      </div>
    </main>
  )
}

function badgeTone(r: GapResult): 'perfect' | 'partial' | 'missed' {
  if (r.resolution === 'correct') return r.attempts === 0 ? 'perfect' : 'partial'
  return 'missed'
}

function resolutionLabel(r: GapResult, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (r.resolution === 'correct') {
    return r.attempts === 0 ? t('result.firstTry') : t('result.afterTries', { count: r.attempts + 1 })
  }
  return t(`result.resolution.${r.resolution}`)
}
