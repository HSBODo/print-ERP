import { describe, it, expect } from 'vitest'
import { weeksOfYear, weeksOfMonth, monthlyToWeekly } from './reportWeeks'

describe('weeksOfYear', () => {
  it('1월 1일이 속한 월~일 주가 1주차다 (2026-01-01=목 → 1주차 월요일은 2025-12-29)', () => {
    const weeks = weeksOfYear(2026)
    expect(weeks[0].week).toBe(1)
    expect(weeks[0].startDate).toBe('2025-12-29')
    expect(weeks[0].endDate).toBe('2026-01-04')
    // 전년 12월 날짜는 daysByMonth 에서 제외 → 1/1~1/4 4일만
    expect(weeks[0].daysByMonth).toEqual({ 1: 4 })
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

  it('그 해 날짜의 월별 일수 합계 = 그 해 일수 (365/366)', () => {
    const total = weeksOfYear(2026)
      .flatMap((w) => Object.values(w.daysByMonth))
      .reduce((a, b) => a + b, 0)
    expect(total).toBe(365)
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

  it('선택한 달의 모든 날짜가 반환된 주차에 덮인다', () => {
    for (let m = 1; m <= 12; m++) {
      const covered = weeksOfMonth(weeks, m).reduce((sum, w) => sum + (w.daysByMonth[m] ?? 0), 0)
      expect(covered).toBe(new Date(Date.UTC(2026, m, 0)).getUTCDate())
    }
  })
})

describe('monthlyToWeekly', () => {
  const weeks = weeksOfMonth(weeksOfYear(2026), 8) // 2026-08: 7/27~8/2 … 8/31~9/6

  it('건수(sum)는 월값을 일수 비례로 나눠 담는다', () => {
    // 8월 = 31일, 값 310 → 하루 10. 첫 주는 8/1~8/2 2일치 = 20
    const out = monthlyToWeekly({ 2026: Array(12).fill(null).map((_, i) => (i === 7 ? 310 : null)) }, weeks, 'sum')
    expect(out[2026][0]).toBe(20)
    // 8월분 합계는 원래 월값과 같다(반올림 오차 ±주차수)
    const total = out[2026].reduce((a: number, b) => a + (b ?? 0), 0)
    expect(Math.abs(total - 310)).toBeLessThanOrEqual(weeks.length)
  })

  it('비율(avg)은 일수 가중평균이라 월값 범위를 벗어나지 않는다', () => {
    const monthly = Array(12).fill(null) as (number | null)[]
    monthly[6] = 60 // 7월
    monthly[7] = 80 // 8월
    const out = monthlyToWeekly({ 2026: monthly }, weeks, 'avg')
    out[2026].forEach((v) => {
      if (v === null) return
      expect(v).toBeGreaterThanOrEqual(60)
      expect(v).toBeLessThanOrEqual(80)
    })
    // 7/27~8/2 = 7월 5일 + 8월 2일 → (60*5 + 80*2)/7
    expect(out[2026][0]).toBeCloseTo((60 * 5 + 80 * 2) / 7, 6)
  })

  it('걸친 달의 값이 모두 없으면 null (선 끊김)', () => {
    const out = monthlyToWeekly({ 2026: Array(12).fill(null) }, weeks, 'sum')
    expect(out[2026].every((v) => v === null)).toBe(true)
  })
})
