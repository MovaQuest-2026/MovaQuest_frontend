/** Лічильник як у стрічці коротких відео: 7962 → «7,962», 12480 → «12.5K». До 10 000 — повне число. */
// Hermes (React Native) підтримує Intl.NumberFormat без notation: 'compact', тож скорочення робимо самі.
export function formatCount(n: number, lang: string): string {
  if (n < 10_000) return new Intl.NumberFormat(lang).format(n)
  const [value, suffix] = n >= 1_000_000_000 ? [n / 1e9, 'B'] : n >= 1_000_000 ? [n / 1e6, 'M'] : [n / 1e3, 'K']
  const rounded = Math.round(value * 10) / 10
  return new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(rounded) + suffix
}

type Unit = 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute'

const UNITS: [Unit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

type Plural = 'one' | 'few' | 'many'

// Запасні тексти для середовищ без Intl.RelativeTimeFormat і Intl.PluralRules (Hermes на Android).
const FALLBACK: Record<'en' | 'uk' | 'es', { now: string; ago: (n: number, unit: Unit) => string }> = {
  en: {
    now: 'now',
    ago: (n, u) => `${n} ${u}${n === 1 ? '' : 's'} ago`,
  },
  uk: {
    now: 'зараз',
    ago: (n, u) => {
      const forms: Record<Unit, Record<Plural, string>> = {
        year: { one: 'рік', few: 'роки', many: 'років' },
        month: { one: 'місяць', few: 'місяці', many: 'місяців' },
        week: { one: 'тиждень', few: 'тижні', many: 'тижнів' },
        day: { one: 'день', few: 'дні', many: 'днів' },
        hour: { one: 'годину', few: 'години', many: 'годин' },
        minute: { one: 'хвилину', few: 'хвилини', many: 'хвилин' },
      }
      return `${n} ${forms[u][ukPlural(n)]} тому`
    },
  },
  es: {
    now: 'ahora',
    ago: (n, u) => {
      const forms: Record<Unit, [string, string]> = {
        year: ['año', 'años'],
        month: ['mes', 'meses'],
        week: ['semana', 'semanas'],
        day: ['día', 'días'],
        hour: ['hora', 'horas'],
        minute: ['minuto', 'minutos'],
      }
      return `hace ${n} ${forms[u][n === 1 ? 0 : 1]}`
    },
  },
}

function ukPlural(n: number): Plural {
  const d = n % 10
  const dd = n % 100
  if (d === 1 && dd !== 11) return 'one'
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return 'few'
  return 'many'
}

/** «2 дні тому». Менше хвилини — «щойно» (numeric: auto дає «now» / «зараз»). */
export function formatAgo(iso: string, lang: string, now = Date.now()): string {
  const sec = Math.max(0, (now - Date.parse(iso)) / 1000)
  const found = UNITS.find(([, size]) => sec >= size)
  const RTF = (Intl as { RelativeTimeFormat?: typeof Intl.RelativeTimeFormat }).RelativeTimeFormat
  if (typeof RTF === 'function') {
    const rtf = new RTF(lang, { numeric: 'auto' })
    return found ? rtf.format(-Math.floor(sec / found[1]), found[0]) : rtf.format(0, 'second')
  }
  const base = lang.split('-')[0]
  const fb = FALLBACK[base === 'uk' || base === 'es' ? base : 'en']
  return found ? fb.ago(Math.floor(sec / found[1]), found[0]) : fb.now
}
