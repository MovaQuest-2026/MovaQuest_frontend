// Перевірка відповіді: транскрипт (або набраний текст) проти очікуваних варіантів.
// Та сама логіка потім житиме на сервері в POST /api/speech/evaluate.

export type Verdict = 'correct' | 'wrong' | 'unclear'

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}

/** Скільки помилок у літерах прощаємо: короткі слова мають збігатися точно. */
function tolerance(length: number): number {
  if (length <= 3) return 0
  if (length <= 7) return 1
  return 2
}

function closeEnough(heard: string, expected: string): boolean {
  return levenshtein(heard, expected) <= tolerance(expected.length)
}

/**
 * correct — сказано очікуване (точно, з дрібною помилкою або всередині довшої фрази:
 * «creo que leche» для «leche»). unclear — порожньо. Інакше wrong.
 */
export function matchAnswer(transcript: string, expected: string[]): Verdict {
  const heard = normalize(transcript)
  if (!heard) return 'unclear'
  const variants = expected.map(normalize).filter(Boolean)
  for (const variant of variants) {
    if (closeEnough(heard, variant)) return 'correct'
    // Шукаємо варіант як послідовність слів усередині сказаного.
    const words = heard.split(' ')
    const size = variant.split(' ').length
    for (let i = 0; i + size <= words.length; i++) {
      if (closeEnough(words.slice(i, i + size).join(' '), variant)) return 'correct'
    }
  }
  return 'wrong'
}

/** Підказка: перша літера, решта букв замінені на «_». «leche» → «l _ _ _ _». */
export function answerHint(answer: string): string {
  return answer
    .split(' ')
    .map((word) => [...word].map((ch, i) => (i === 0 || !/\p{L}/u.test(ch) ? ch : '_')).join(' '))
    .join('   ')
}
