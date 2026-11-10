import { describe, expect, it } from 'vitest'
import { stableShuffle } from './stableShuffle'

describe('stableShuffle', () => {
  const items = ['correct', 'wrong', 'unclear']

  it('is deterministic for a seed', () => {
    expect(stableShuffle(items, 'shop-spain/s1_order')).toEqual(stableShuffle(items, 'shop-spain/s1_order'))
  })

  it('never keeps the authored order and keeps all items', () => {
    for (const seed of ['a', 'b', 'shop-spain/s1_order', 'shop-spain/s1w_drink', 'shop-spain/s2_pay']) {
      const out = stableShuffle(items, seed)
      expect(out).not.toEqual(items)
      expect([...out].sort()).toEqual([...items].sort())
    }
  })
})
