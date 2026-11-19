import { useTranslation } from 'react-i18next'
import { translate } from '../../i18n/localize'
import { useUserStore } from '../../store/useUserStore'
import type { Lesson } from '../../types/lesson'
import type { GapResult } from './gapMachine'

interface ResultWordListProps {
  lesson: Lesson
  /** Результати проходження; без них (збережений підсумок) показуємо лише слова. */
  results?: GapResult[]
}

/** Слова відео з результатом кожної паузи: спільне для модального вікна й сторінки підсумку. */
export function ResultWordList({ lesson, results }: ResultWordListProps) {
  const { t } = useTranslation()
  const lang = useUserStore((s) => s.interfaceLanguage)
  return (
    <ul className="result-list">
      {lesson.gaps.map((gap) => {
        const r = results?.find((x) => x.gapId === gap.id)
        const tr = translate(gap.translation, lang)
        return (
          <li key={gap.id} className="result-list__row">
            <div className="result-list__text">
              <p className="result-list__line">
                <span className="result-list__quote" lang="es">
                  {gap.context && `${gap.context} `}
                  <strong className="result-list__answer">{gap.answer}</strong>
                </span>
                {tr && <span className="result-list__tr"> · {tr}</span>}
              </p>
              {r && r.heard.length > 0 && r.resolution !== 'correct' && (
                <p className="result-list__heard" lang="es">
                  {t('result.youSaid', { heard: r.heard.join(', ') })}
                </p>
              )}
            </div>
            {r && <span className={`badge badge--${badgeTone(r)}`}>{resolutionLabel(r, t)}</span>}
          </li>
        )
      })}
    </ul>
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
