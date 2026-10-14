import { describe, expect, it } from 'vitest'

import { formatValue, summarize } from './format'

describe('formatValue', () => {
  it('건수는 천 단위 쉼표, 비율은 소수 1자리', () => {
    expect(formatValue('count', 1234)).toBe('1,234')
    expect(formatValue('percent', 73.44)).toBe('73.4%')
    expect(formatValue('percent', 73.44, 0)).toBe('73%')
  })
})

describe('summarize', () => {
  it('건수는 합계, 비율은 평균', () => {
    expect(summarize('count', [1, 2, 3])).toBe(6)
    expect(summarize('percent', [10, 20])).toBe(15)
  })

  it('값이 없으면 null, 0 은 0', () => {
    expect(summarize('count', [])).toBeNull()
    expect(summarize('count', [0])).toBe(0)
  })
})
