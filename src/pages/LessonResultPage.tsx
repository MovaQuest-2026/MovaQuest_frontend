import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getLesson } from '../api/getLesson'
import { stumbles } from '../features/player/sceneMachine'
import { localize } from '../i18n/localize'
import { usePlayerStore } from '../store/usePlayerStore'
import { useUserStore } from '../store/useUserStore'
import type { BranchKind, Lesson } from '../types/lesson'

interface Stumble {
  sceneId: string
  counts: Partial<Record<BranchKind, number>>
}

export function LessonResultPage() {
  const { lessonId = '' } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const lang = useUserStore((s) => s.interfaceLanguage)
  const saved = useUserStore((s) => s.completedLessons[lessonId])
  const lastResult = usePlayerStore((s) => (s.lastResult?.lessonId === lessonId ? s.lastResult : null))
  const [lesson, setLesson] = useState<Lesson | null>(null)

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

  const grouped = lastResult ? groupStumbles(lastResult.history) : null
  const choiceScenes = lesson.scenes.filter((s) => s.choice)

  return (
    <main className="page">
      <header className={`result-hero result-hero--${outcome}`}>
        <h1 className="page__title">{t(`result.outcomes.${outcome}.title`)}</h1>
        <p className="page__subtitle">{t(`result.outcomes.${outcome}.body`)}</p>
        <p className="muted">{localize(lesson.title, lang)}</p>
      </header>

      {grouped && (
        <section className="stack">
          <h2 className="section-title">{t('result.stumbles')}</h2>
          {grouped.length === 0 && <p className="muted">{t('result.stumblesNone')}</p>}
          {grouped.length > 0 && (
            <ul className="result-list">
              {grouped.map((g) => {
                const scene = lesson.scenes.find((s) => s.id === g.sceneId)
                if (!scene?.choice) return null
                return (
                  <li key={g.sceneId} className="card stack">
                    <p className="result-list__quote" lang="es">
                      «{scene.subtitles.es}»
                    </p>
                    <p>{localize(scene.choice.task, lang)}</p>
                    <div className="row">
                      {(Object.entries(g.counts) as [BranchKind, number][]).map(([branch, count]) => (
                        <span key={branch} className={`badge badge--${branch === 'wrong' ? 'missed' : 'partial'}`}>
                          {t(`result.branch.${branch}`)} {count > 1 ? t('result.times', { count }) : ''}
                        </span>
                      ))}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      )}

      <section className="stack">
        <h2 className="section-title">{t('result.phrases')}</h2>
        <ul className="result-list">
          {choiceScenes.map((scene) => {
            const phrase = scene.choice!.phrases.find((p) => p.branch === 'correct')
            if (!phrase) return null
            return (
              <li key={scene.id} className="card">
                <p className="phrase-card__es" lang="es">
                  {phrase.es}
                </p>
                <p className="phrase-card__tr">{localize(phrase.translation, lang)}</p>
              </li>
            )
          })}
        </ul>
      </section>

      <div className="stack">
        <button
          type="button"
          className="btn btn--primary btn--block"
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

function groupStumbles(history: Parameters<typeof stumbles>[0]): Stumble[] {
  const map = new Map<string, Stumble>()
  for (const h of stumbles(history)) {
    const entry = map.get(h.sceneId) ?? { sceneId: h.sceneId, counts: {} }
    entry.counts[h.branch!] = (entry.counts[h.branch!] ?? 0) + 1
    map.set(h.sceneId, entry)
  }
  return [...map.values()]
}
