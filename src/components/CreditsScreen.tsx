import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { getCredits } from '../api/getCredits'
import { parseSimpleMarkdown, type MarkdownBlock } from './parseSimpleMarkdown'

export function CreditsScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [blocks, setBlocks] = useState<MarkdownBlock[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    getCredits()
      .then((text) => {
        if (!cancelled) setBlocks(parseSimpleMarkdown(text))
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="screen credits-screen">
      <div className="credits-content">
        {failed && <p>{t('credits.loadError')}</p>}
        {blocks?.map((block, index) => {
          if (block.type === 'heading') {
            const Heading = `h${block.level}` as const
            return <Heading key={index}>{block.text}</Heading>
          }
          if (block.type === 'list') {
            return (
              <ul key={index}>
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )
          }
          return <p key={index}>{block.text}</p>
        })}
      </div>
      <button type="button" onClick={() => navigate('/')}>
        {t('credits.back')}
      </button>
    </div>
  )
}
