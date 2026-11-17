import { useTranslation } from 'react-i18next'
import { localize } from '../../i18n/localize'
import { useUserStore } from '../../store/useUserStore'
import type { Lesson, Outcome } from '../../types/lesson'
import type { GapResult } from './gapMachine'
import { ResultWordList } from './ResultWordList'

interface ResultModalProps {
  lesson: Lesson
  results: GapResult[]
  outcome: Outcome
  /** Є наступне відео в стрічці. */
  hasNext: boolean
  onTryAgain: () => void
  onNext: () => void
}

/**
 * Підсумок проходження поверх відео. Усі слова правильно: вітання й дві кнопки.
 * Інакше: рахунок і слова з результатами, ті самі дві кнопки.
 */
export function ResultModal({ lesson, results, outcome, hasNext, onTryAgain, onNext }: ResultModalProps) {
  const { t } = useTranslation()
  const lang = useUserStore((s) => s.interfaceLanguage)
  const correct = results.filter((r) => r.resolution === 'correct').length
  const total = lesson.gaps.length
  const perfect = outcome === 'perfect'

  return (
    <div className="result-modal__backdrop">
      <section className="result-modal" role="dialog" aria-modal="true" aria-labelledby="result-modal-title">
        <header className={`result-modal__head result-modal__head--${outcome}`}>
          {perfect && (
            <p className="result-modal__emoji" aria-hidden="true">
              🎉
            </p>
          )}
          <h2 id="result-modal-title" className="section-title">
            {t(`result.outcomes.${outcome}.title`)}
          </h2>
          <p className="muted">{t(`result.outcomes.${outcome}.body`)}</p>
          <p className="stat">{t('result.score', { correct, total })}</p>
          <p className="muted">{localize(lesson.title, lang)}</p>
        </header>

        {!perfect && (
          <div className="result-modal__words">
            <h3 className="section-title">{t('result.words')}</h3>
            <ResultWordList lesson={lesson} results={results} />
          </div>
        )}

        <div className="result-modal__actions">
          <button type="button" className={`btn btn--block${hasNext ? '' : ' btn--primary'}`} onClick={onTryAgain}>
            ↺ {t('result.tryAgain')}
          </button>
          {hasNext && (
            <button type="button" className="btn btn--primary btn--block" onClick={onNext}>
              {t('result.nextLesson')} ▶
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
