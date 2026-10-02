import { describe, expect, it } from 'vitest'

import {
  buildCalendar,
  calendarRange,
  formatMetric,
  rateOf,
} from './reservationChangeCalendarModel'

const row = (day: string, branch: string, total: number, changed: number) => ({
  day,
  branch,
  total,
  changed,
})

describe('reservationChangeCalendarModel', () => {
  it('그리드 범위는 월요일 시작 ~ 일요일 끝', () => {
    expect(calendarRange('2026-09')).toEqual({
      from: '2026-08-31',
      to: '2026-10-04',
    })
    expect(calendarRange('2026-02')).toEqual({
      from: '2026-01-26',
      to: '2026-03-01',
    })
  })

  it('주 행은 ISO 주차를 달고, 합계는 그 달의 날만 센다', () => {
    const view = buildCalendar(
      '2026-09',
      [
        row('2026-08-31', 'M', 9, 3), // 그리드 안이지만 8월 — 합계 제외
        row('2026-09-01', 'M', 10, 2),
        row('2026-09-01', 'D', 4, 1),
        row('2026-09-08', 'H', 6, 3),
        row('2026-10-01', 'M', 7, 7), // 10월 — 제외
      ],
      '',
    )
    expect(view.weeks).toHaveLength(5)
    expect(view.weeks.map((w) => w.isoWeek)).toEqual([36, 37, 38, 39, 40])
    expect(view.weeks[0].days[0]).toMatchObject({
      date: '2026-08-31',
      inMonth: false,
      total: 9,
    })
    expect(view.weeks[0].days[1]).toMatchObject({
      date: '2026-09-01',
      inMonth: true,
      total: 14,
      changed: 3,
      rate: 21.4,
    })
    expect(view.weeks[0]).toMatchObject({ total: 14, changed: 3, rate: 21.4 })
    expect(view.weeks[1]).toMatchObject({ total: 6, changed: 3, rate: 50 })
    expect(view).toMatchObject({ total: 20, changed: 6, rate: 30 })
    expect(view.max).toEqual({ total: 14, changed: 3, rate: 50 })
  })

  it('구분 필터와 명절 창·당일 표시', () => {
    const view = buildCalendar(
      '2026-09',
      [
        row('2026-09-01', 'M', 10, 2),
        row('2026-09-01', 'D', 4, 1),
        row('2026-09-25', 'M', 1, 0),
      ],
      'D',
    )
    expect(view.total).toBe(4)
    const days = view.weeks.flatMap((w) => w.days)
    expect(days.find((d) => d.date === '2026-09-25')).toMatchObject({
      holiday: '명절(추석)',
      holidayDay: '명절(추석)',
    })
    expect(days.find((d) => d.date === '2026-09-22')).toMatchObject({
      holiday: '명절(추석)',
      holidayDay: '',
    })
  })

  it('변경률과 표기', () => {
    expect(rateOf(3, 14)).toBeCloseTo(21.4, 6)
    expect(rateOf(0, 0)).toBeNull()
    expect(formatMetric(21.4, 'rate')).toBe('21.4%')
    expect(formatMetric(1234, 'total')).toBe('1,234')
    expect(formatMetric(null, 'changed')).toBe('')
  })
})
