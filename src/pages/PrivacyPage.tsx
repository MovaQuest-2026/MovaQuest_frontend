import { useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import i18n, { SUPPORTED_LANGUAGES } from '../i18n'
import { Segmented } from '../components/Segmented'
import { LEGAL } from '../lib/legal'
import { useUserStore } from '../store/useUserStore'
import type { Lang } from '../types/lesson'
import en from '../i18n/locales/privacy/en.json'
import uk from '../i18n/locales/privacy/uk.json'
import es from '../i18n/locales/privacy/es.json'

// Довгі тексти політики живуть в окремому просторі імен і вантажаться лише з цією (лінивою) сторінкою.
const NS = 'privacy'
i18n.addResourceBundle('en', NS, en, true, true)
i18n.addResourceBundle('uk', NS, uk, true, true)
i18n.addResourceBundle('es', NS, es, true, true)

export type PrivacyBlock =
  | { h: string }
  | { p: string }
  | { ul: string[] }
  | { table: { head: string[]; rows: string[][] } }
  | { email: true }

export interface PrivacySection {
  id: string
  title: string
  blocks: PrivacyBlock[]
}

const isLang = (v: string | null): v is Lang => SUPPORTED_LANGUAGES.includes(v as Lang)

function Block({ block }: { block: PrivacyBlock }) {
  if ('h' in block) return <h3 className="privacy__subtitle">{block.h}</h3>
  if ('p' in block) return <p>{block.p}</p>
  if ('ul' in block)
    return (
      <ul className="privacy__list">
        {block.ul.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    )
  if ('table' in block)
    return (
      <div className="privacy__table-wrap">
        <table className="privacy__table">
          <thead>
            <tr>
              {block.table.head.map((cell) => (
                <th key={cell} scope="col">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.table.rows.map((row) => (
              <tr key={row[0]}>
                {/* data-label: на вузькому екрані рядок стає карткою з підписами колонок. */}
                {row.map((cell, i) =>
                  i === 0 ? (
                    <th key={i} scope="row">
                      {cell}
                    </th>
                  ) : (
                    <td key={i} data-label={block.table.head[i]}>
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  return (
    <p>
      <a className="privacy__email" href={`mailto:${LEGAL.email}`}>
        {LEGAL.email}
      </a>
    </p>
  )
}

/**
 * Публічна політика конфіденційності (/privacy, ?lang=en|uk|es). Відкривається без акаунта й без онбордингу:
 * на неї посилаються лендінг, /auth, профіль і сторінка застосунку в Google Play.
 */
export default function PrivacyPage() {
  // Підписка на зміну мови інтерфейсу, коли ?lang не задано.
  useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const interfaceLanguage = useUserStore((s) => s.interfaceLanguage)
  const requested = params.get('lang')
  const lang: Lang = isLang(requested) ? requested : interfaceLanguage
  const tp = i18n.getFixedT(lang, NS)
  // Загальні підписи (Назад, назви мов) теж мовою політики, а не інтерфейсу.
  const tl = i18n.getFixedT(lang)
  const vars = { ...LEGAL, date: new Intl.DateTimeFormat(lang, { dateStyle: 'long' }).format(new Date(LEGAL.updated)) }
  const sections = tp('sections', { ...vars, returnObjects: true }) as PrivacySection[]

  const pageTitle = `${tp('title')} · ${tl('app.name')}`
  useEffect(() => {
    const previous = document.title
    document.title = pageTitle
    return () => {
      document.title = previous
    }
  }, [pageTitle])

  // Прийшли по прямому посиланню (немає історії в застосунку) — «Назад» веде на лендінг.
  const back = () => (location.key === 'default' ? navigate('/') : navigate(-1))

  return (
    <main className="page privacy" lang={lang}>
      <div className="row">
        <button type="button" className="btn btn--ghost privacy__back" onClick={back}>
          ← {tl('app.back')}
        </button>
      </div>

      <header className="stack">
        <h1 className="page__title">{tp('title')}</h1>
        <p className="page__subtitle">{tp('updated', vars)}</p>
        <Segmented
          label={tp('languageLabel')}
          value={lang}
          compact
          options={SUPPORTED_LANGUAGES.map((l) => ({ value: l as Lang, label: tl(`languages.${l}`) }))}
          onChange={(next) => setParams({ lang: next }, { replace: true })}
        />
        <p>{tp('intro')}</p>
      </header>

      {sections.map((section) => (
        <section key={section.id} id={section.id} className="privacy__section" aria-labelledby={`${section.id}-title`}>
          <h2 id={`${section.id}-title`} className="section-title">
            {section.title}
          </h2>
          {section.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </section>
      ))}
    </main>
  )
}
