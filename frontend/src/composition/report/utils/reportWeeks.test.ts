import { describe, expect, it } from 'vitest'

import { weeksOfMonth, weeksOfYear } from './reportWeeks'

describe('weeksOfYear', () => {
  it('ISO 8601 주차를 따른다 (2026년 1주차 = 2025-12-29~2026-01-04)', () => {
    const weeks = weeksOfYear(2026)
    expect(weeks[0].week).toBe(1)
    expect(weeks[0].startDate).toBe('2025-12-29')
    expect(weeks[0].endDate).toBe('2026-01-04')
    // 전년 12월 날짜는 daysByMonth 에서 제외 → 1/1~1/4 4일만
    expect(weeks[0].daysByMonth).toEqual({ 1: 4 })
    // 마지막 주차(53주)는 다음 해 1월을 문다
    expect(weeks).toHaveLength(53)
    expect(weeks[52].startDate).toBe('2026-12-28')
    expect(weeks[52].endDate).toBe('2027-01-03')
  })

  it('첫 목요일이 든 주가 1주차 — 2027년은 1/4(월) 시작', () => {
    const weeks = weeksOfYear(2027)
    expect(weeks[0].startDate).toBe('2027-01-04')
    // 1/1~1/3 은 2026년 53주차 소속이라 2027년 1주차에 없다
    expect(weeks[0].daysByMonth).toEqual({ 1: 7 })
  })

  it('연간 주차는 52 또는 53개이고 주차 번호가 1부터 연속한다', () => {
    for (const year of [2024, 2025, 2026, 2027]) {
      const weeks = weeksOfYear(year)
      expect(weeks.length).toBeGreaterThanOrEqual(52)
      expect(weeks.length).toBeLessThanOrEqual(53)
      expect(weeks.map((w) => w.week)).toEqual(weeks.map((_, i) => i + 1))
    }
  })

  it('모든 주는 월요일 시작·일요일 종료이고 7일 간격이다', () => {
    const weeks = weeksOfYear(2026)
    weeks.forEach((w) => {
      expect(new Date(`${w.startDate}T00:00:00Z`).getUTCDay()).toBe(1) // 월
      expect(new Date(`${w.endDate}T00:00:00Z`).getUTCDay()).toBe(0) // 일
    })
    const gap =
      new Date(`${weeks[1].startDate}T00:00:00Z`).getTime() -
      new Date(`${weeks[0].startDate}T00:00:00Z`).getTime()
    expect(gap).toBe(7 * 86_400_000)
  })

  it('2026년은 ISO 주차가 그 해 365일을 빠짐없이 덮는다', () => {
    const total = weeksOfYear(2026)
      .flatMap((w) => Object.values(w.daysByMonth))
      .reduce((a, b) => a + b, 0)
    expect(total).toBe(365)
  })

  it('ISO 특성상 연초 며칠이 전년 마지막 주차 소속이면 그만큼 빠진다 (2027: 1/1~1/3)', () => {
    const total = weeksOfYear(2027)
      .flatMap((w) => Object.values(w.daysByMonth))
      .reduce((a, b) => a + b, 0)
    expect(total).toBe(365 - 3)
  })
})

describe('weeksOfMonth', () => {
  const weeks = weeksOfYear(2026)

  it('월 경계 주차를 양쪽 달에 모두 포함한다', () => {
    const july = weeksOfMonth(weeks, 7)
    const august = weeksOfMonth(weeks, 8)
    // 7/27~8/2 주차는 7월·8월 목록 양쪽에 나온다
    const shared = july.filter((w) => august.some((a) => a.week === w.week))
    expect(shared).toHaveLength(1)
    expect(shared[0].crossMonth).toBe(true)
    expect(shared[0].startDate).toBe('2026-07-27')
    expect(shared[0].endDate).toBe('2026-08-02')
  })

  it('선택한 달의 모든 날짜가 반환된 주차에 덮인다 (2026 기준)', () => {
    for (let m = 1; m <= 12; m++) {
      const covered = weeksOfMonth(weeks, m).reduce(
        (sum, w) => sum + (w.daysByMonth[m] ?? 0),
        0,
      )
      expect(covered).toBe(new Date(Date.UTC(2026, m, 0)).getUTCDate())
    }
  })
})
