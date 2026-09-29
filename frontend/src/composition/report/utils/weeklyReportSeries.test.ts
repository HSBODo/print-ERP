import { describe, it, expect } from 'vitest'
import type { WeeklyReportItem } from '#domain/core/report/type/api'
import { weeksOfYear, weeksOfMonth } from './reportWeeks'
import { buildWeeklySeries } from './weeklyReportSeries'

const week = (over: Partial<WeeklyReportItem>): WeeklyReportItem => ({
  year: 2026, week: 1, startDate: '2025-12-29', endDate: '2026-01-04',
  reservations: null, call: null, online: null,
  introGeneral: null, introCustomer: null, introStaff: null,
  jobOffice: null, jobStudent: null, jobEtc: null,
  examTotal: null, visionExam: null, cataractExam: null, oneDay: null,
  visionBooked: null, cataractBooked: null,
  oneDayBooked: null, stopCount: null,
  examGeneralBase: null, bookedGeneral: null,
  visionSurgery: null, cataractSurgery: null, totalSurgery: null,
  reoperation: null, reopLaser: null, reopLens: null,
  outpatient: null,
  dreamlensNew: null, dreamlensFu: null,
  ...over,
})

const weeks2026 = weeksOfYear(2026)
const YEARS = [2024, 2025, 2026]

describe('buildWeeklySeries', () => {
  it('주차 번호로 연도를 맞춰 같은 인덱스에 놓는다', () => {
    const series = buildWeeklySeries(
      [
        week({ year: 2026, week: 2, outpatient: 900 }),
        week({ year: 2025, week: 2, outpatient: 850 }),
      ],
      weeks2026,
      YEARS,
    )
    // weeks2026[1] = 2주차
    expect(series.outpatient?.[2026][1]).toBe(900)
    expect(series.outpatient?.[2025][1]).toBe(850)
    expect(series.outpatient?.[2024][1]).toBeNull()
  })

  it('응답에 없는 주는 null (선 끊김)', () => {
    const series = buildWeeklySeries([week({ week: 1, visionExam: 100 })], weeks2026, YEARS)
    expect(series.visionExam?.[2026][0]).toBe(100)
    expect(series.visionExam?.[2026][1]).toBeNull()
  })

  it('예약률·비율은 분자/분모로 계산하고 분모가 0이면 null', () => {
    const series = buildWeeklySeries(
      [
        week({ week: 1, examTotal: 250, visionExam: 200, visionBooked: 150, oneDay: 80, oneDayBooked: 60, stopCount: 10 }),
        week({ week: 2, examTotal: 0, visionExam: 0, visionBooked: 0, oneDay: 0, oneDayBooked: 0, stopCount: 0 }),
      ],
      weeks2026,
      YEARS,
    )
    expect(series.visionRate?.[2026][0]).toBeCloseTo(75, 6)
    expect(series.rateOneday?.[2026][0]).toBeCloseTo(75, 6)
    expect(series.stopRate?.[2026][0]).toBeCloseTo(5, 6)
    // 일반검사 = 검사수(전체) - 원데이 = 250 - 80 = 170 → '원데이 + 일반 = 검사수' 가 성립한다.
    // (시력교정 기준이면 120 이었다 — 2026-08-05 정의 변경)
    expect(series.examGeneral?.[2026][0]).toBe(170)
    expect(series.ratioGeneral?.[2026][0]).toBeCloseTo(68, 6)
    // 분모 0 → null
    expect(series.visionRate?.[2026][1]).toBeNull()
    expect(series.ratioGeneral?.[2026][1]).toBeNull()
  })

  it('온라인 예약이 미상(null)인 주는 그대로 null 로 남는다', () => {
    const series = buildWeeklySeries(
      [week({ week: 3, call: 200, online: null, reservations: null })],
      weeks2026,
      YEARS,
    )
    expect(series.call?.[2026][2]).toBe(200)
    expect(series.online?.[2026][2]).toBeNull()
    expect(series.reservations?.[2026][2]).toBeNull()
  })

  it('월 선택 시 그 달에 걸친 주차만, 월 경계 주차 포함해 뽑는다', () => {
    const august = weeksOfMonth(weeks2026, 8)
    const series = buildWeeklySeries(
      [week({ week: august[0].week, outpatient: 700 })],
      august,
      YEARS,
    )
    expect(august[0].crossMonth).toBe(true) // 7/27~8/2
    expect(series.outpatient?.[2026][0]).toBe(700)
    expect(series.outpatient?.[2026]).toHaveLength(august.length)
  })
})
