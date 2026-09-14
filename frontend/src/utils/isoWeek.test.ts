import { describe, expect, it } from 'vitest'

import { addDays, isoWeek, isoWeekMonday, isoWeeksInYear, isoYearRange, toIsoDate } from './isoWeek'

describe('isoWeek', () => {
  it('첫 목요일이 든 주가 1주차 — 2026-01-01(목)은 2026년 1주차', () => {
    expect(isoWeek(new Date(2026, 0, 1))).toEqual({ year: 2026, week: 1 })
  })

  it('전년 12월 말도 다음 해 1주차에 속할 수 있다', () => {
    expect(isoWeek(new Date(2025, 11, 29))).toEqual({ year: 2026, week: 1 }) // 2025-12-29(월)
    expect(isoWeek(new Date(2025, 11, 28))).toEqual({ year: 2025, week: 52 }) // 2025-12-28(일)
  })

  it('월요일 시작 — 같은 주의 월~일은 모두 같은 주차', () => {
    for (let i = 0; i < 7; i++) {
      expect(isoWeek(new Date(2026, 5, 1 + i)).week).toBe(23) // 2026-06-01(월)~06-07(일)
    }
    expect(isoWeek(new Date(2026, 5, 8)).week).toBe(24)
  })
})

describe('isoWeeksInYear', () => {
  it('1월 1일이 목요일인 해는 53주차까지 있다', () => {
    expect(isoWeeksInYear(2026)).toBe(53) // 2026-01-01 목
    expect(isoWeeksInYear(2025)).toBe(52)
    expect(isoWeeksInYear(2024)).toBe(52)
  })
})

describe('isoWeekMonday', () => {
  it('N주차의 월요일을 돌려준다', () => {
    expect(toIsoDate(isoWeekMonday(2026, 1))).toBe('2025-12-29')
    expect(toIsoDate(isoWeekMonday(2026, 2))).toBe('2026-01-05')
    expect(toIsoDate(isoWeekMonday(2026, 53))).toBe('2026-12-28')
    expect(isoWeek(isoWeekMonday(2026, 30))).toEqual({ year: 2026, week: 30 })
  })
})

describe('isoYearRange', () => {
  it('1주차 월요일 ~ 마지막 주차 일요일 (연·월 경계를 넘는다)', () => {
    expect(isoYearRange(2026)).toEqual({ from: '2025-12-29', to: '2027-01-03', weeks: 53 })
    expect(isoYearRange(2025)).toEqual({ from: '2024-12-30', to: '2025-12-28', weeks: 52 })
  })

  it('범위 일수 = 주차 수 x 7 (백엔드 최대 조회 기간 371일 이내)', () => {
    const { from, to, weeks } = isoYearRange(2026)
    const days = (new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86_400_000 + 1
    expect(days).toBe(weeks * 7)
    expect(days).toBeLessThanOrEqual(371)
  })
})

describe('addDays', () => {
  it('월·연 경계를 넘어간다', () => {
    expect(toIsoDate(addDays(new Date(2026, 0, 31), 1))).toBe('2026-02-01')
    expect(toIsoDate(addDays(new Date(2025, 11, 29), 6))).toBe('2026-01-04')
  })
})
