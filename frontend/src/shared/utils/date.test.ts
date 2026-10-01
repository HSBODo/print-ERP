import { describe, expect, it } from 'vitest'

import {
  capToToday,
  daysBetween,
  monthRange,
  shiftMonth,
  todayIso,
  validateRange,
  yearsDesc,
} from '#shared/utils/date'

describe('date', () => {
  it('monthRange 는 말일까지 채운다 (윤년 포함)', () => {
    expect(monthRange('2024-02')).toEqual({
      from: '2024-02-01',
      to: '2024-02-29',
    })
    expect(monthRange('2026-12')).toEqual({
      from: '2026-12-01',
      to: '2026-12-31',
    })
  })

  it('shiftMonth 는 연 경계를 넘긴다', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2025-12', 1)).toBe('2026-01')
  })

  it('capToToday 는 오늘 이후 종료일만 자른다', () => {
    expect(capToToday({ from: '2020-01-01', to: '2999-12-31' }).to).toBe(
      todayIso(),
    )
    expect(capToToday({ from: '2020-01-01', to: '2020-01-31' }).to).toBe(
      '2020-01-31',
    )
  })

  it('daysBetween 은 양 끝을 포함한다', () => {
    expect(daysBetween('2026-09-01', '2026-09-01')).toBe(1)
    expect(daysBetween('2026-09-01', '2026-11-30')).toBe(91)
  })

  it('validateRange 는 순서·최대 일수를 검사한다', () => {
    expect(validateRange({ from: '2026-09-02', to: '2026-09-01' })).toBe(
      '시작일이 종료일보다 늦습니다.',
    )
    expect(
      validateRange({ from: '2026-01-01', to: '2026-12-31' }, { maxDays: 92 }),
    ).toBe('조회 기간은 최대 92일까지 가능합니다 (현재 365일).')
    expect(
      validateRange({ from: '2026-09-01', to: '2026-09-30' }, { maxDays: 92 }),
    ).toBeNull()
  })

  it('yearsDesc 는 내림차순', () => {
    expect(yearsDesc(2024, 2026)).toEqual([2026, 2025, 2024])
  })
})
