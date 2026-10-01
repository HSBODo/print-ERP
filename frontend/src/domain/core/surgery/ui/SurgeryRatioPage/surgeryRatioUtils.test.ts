import { describe, expect, it } from 'vitest'

import { type SurgeryMonthlyItem } from '../../type/api'
import { EMPTY_DATA, toYearMap } from './surgeryRatioUtils'

const item = (
  overrides: Partial<SurgeryMonthlyItem> = {},
): SurgeryMonthlyItem => ({
  year: 2026,
  month: 4,
  lasek: 10,
  lasik: 20,
  smile: 5,
  smilePro: 3,
  icl: 8,
  tIcl: 2,
  kpl: 1,
  tKpl: 1,
  viva: 4,
  catMulti: 6,
  catMono: 7,
  catEdof: 2,
  total: 69,
  ...overrides,
})

describe('toYearMap', () => {
  it('month-1 인덱스로 12개월 배열에 12개 수술키를 채운다', () => {
    const map = toYearMap([item({ month: 4 })])

    expect(map[2026]).toHaveLength(12)
    const april = map[2026][3]
    expect(april.lasik).toBe(20)
    expect(april.catMono).toBe(7)
    expect(april.viva).toBe(4)
  })

  it('값이 없는 달은 EMPTY_DATA', () => {
    const map = toYearMap([item({ month: 4 })])
    expect(map[2026][0]).toEqual(EMPTY_DATA)
  })

  it('여러 연도를 분리한다', () => {
    const map = toYearMap([
      item({ year: 2025, month: 1 }),
      item({ year: 2026, month: 4 }),
    ])

    expect(Object.keys(map).sort((a, b) => a.localeCompare(b, 'ko'))).toEqual([
      '2025',
      '2026',
    ])
    expect(map[2025][0].lasek).toBe(10)
    expect(map[2026][3].lasik).toBe(20)
  })
})
