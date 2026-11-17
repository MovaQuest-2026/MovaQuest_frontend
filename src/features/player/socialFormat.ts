/** Лічильник як у стрічці коротких відео: 7962 → «8K», 12480 → «12.5K». До 10 000 — повне число. */
export function formatCount(n: number, lang: string): string {
  if (n < 10_000) return new Intl.NumberFormat(lang).format(n)
  return new Intl.NumberFormat(lang, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

/** «2 дні тому». Менше хвилини — «щойно» (numeric: auto дає «now» / «зараз»). */
export function formatAgo(iso: string, lang: string, now = Date.now()): string {
  const sec = Math.max(0, (now - Date.parse(iso)) / 1000)
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' })
  for (const [unit, size] of UNITS) {
    if (sec >= size) return rtf.format(-Math.floor(sec / size), unit)
  }
  return rtf.format(0, 'second')
}
