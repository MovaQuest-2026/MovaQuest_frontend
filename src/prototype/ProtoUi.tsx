import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export function StubBadge() {
  return <span className="proto-badge">Заглушка</span>
}

export function StubButton({ children }: { children: ReactNode }) {
  return (
    <button type="button" className="proto-btn proto-btn-stub" disabled>
      {children} <StubBadge />
    </button>
  )
}

export function StubBlock({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="proto-stub-block">
      <div className="proto-stub-block-title">
        {title} <StubBadge />
      </div>
      {children && <div className="proto-muted">{children}</div>}
    </div>
  )
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="proto-eyebrow">
      <span className="proto-eyebrow-dot" aria-hidden="true" />
      {children}
    </p>
  )
}

export function Logo() {
  return (
    <>
      <span className="proto-logo-mark" aria-hidden="true">
        М
      </span>
      <span className="proto-logo-text">MovaQuest</span>
    </>
  )
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label?: string }) {
  const percent = max === 0 ? 0 : Math.round((value / max) * 100)
  return (
    <div className="proto-progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
      <div className="proto-progress-fill" style={{ width: `${percent}%` }} />
    </div>
  )
}

type PageProps = { title: string; eyebrow?: string; back?: string; wide?: boolean; children: ReactNode }

export function Page({ title, eyebrow, back, wide, children }: PageProps) {
  const navigate = useNavigate()
  return (
    <section className={`proto-page${wide ? ' proto-page-wide' : ''}`}>
      <div className="proto-page-head">
        {back && (
          <button type="button" className="proto-back" onClick={() => navigate(back)}>
            ← Назад
          </button>
        )}
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1>{title}</h1>
      </div>
      {children}
    </section>
  )
}

type TileProps = {
  to?: string
  emoji: string
  title: string
  description?: string
  stub?: boolean
  meta?: string
  tone?: 'paper' | 'ochre' | 'tram' | 'stop'
}

export function Tile({ to, emoji, title, description, stub, meta, tone = 'paper' }: TileProps) {
  const content = (
    <>
      <span className="proto-tile-emoji" aria-hidden="true">
        {emoji}
      </span>
      <span className="proto-tile-title">
        {title} {stub && <StubBadge />}
      </span>
      {meta && <span className="proto-chip">{meta}</span>}
      {description && <span className="proto-tile-text">{description}</span>}
    </>
  )
  const className = `proto-tile proto-tone-${tone}`
  if (stub || !to) return <div className={`${className} proto-disabled`}>{content}</div>
  return (
    <Link to={to} className={className}>
      {content}
    </Link>
  )
}
