import { describe, expect, it } from 'vitest'
import { answerHint, levenshtein, matchAnswer, normalize } from './matchAnswer'

describe('normalize', () => {
  it('drops case, accents and punctuation', () => {
    expect(normalize('¡Mañana, sí!  Está')).toBe('manana si esta')
  })
})

describe('levenshtein', () => {
  it('counts edits', () => {
    expect(levenshtein('leche', 'leche')).toBe(0)
    expect(levenshtein('leche', 'lece')).toBe(1)
    expect(levenshtein('', 'abc')).toBe(3)
  })
})

describe('matchAnswer', () => {
  it('accepts the exact answer regardless of accents and case', () => {
    expect(matchAnswer('Café', ['café'])).toBe('correct')
    expect(matchAnswer('cafe.', ['café'])).toBe('correct')
  })

  it('accepts any listed variant', () => {
    expect(matchAnswer('el metro', ['metro', 'el metro'])).toBe('correct')
  })

  it('forgives a small typo in longer words only', () => {
    expect(matchAnswer('leshe', ['leche'])).toBe('correct')
    expect(matchAnswer('sol', ['sal'])).toBe('wrong')
  })

  it('finds the answer inside a longer utterance', () => {
    expect(matchAnswer('creo que es leche', ['leche'])).toBe('correct')
    expect(matchAnswer('pues a las ocho y media', ['ocho y media'])).toBe('correct')
  })

  it('returns wrong for another word and unclear for silence', () => {
    expect(matchAnswer('azúcar', ['leche'])).toBe('wrong')
    expect(matchAnswer('  ', ['leche'])).toBe('unclear')
    expect(matchAnswer('¿?', ['leche'])).toBe('unclear')
  })
})

describe('answerHint', () => {
  it('keeps the first letter of each word', () => {
    expect(answerHint('leche')).toBe('l _ _ _ _')
    expect(answerHint('el metro')).toBe('e _   m _ _ _ _')
  })
})
