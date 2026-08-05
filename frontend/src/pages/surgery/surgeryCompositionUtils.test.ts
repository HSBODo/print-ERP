import { describe, expect, it } from 'vitest'

import { EMPTY, buildSurgeryRows, monthRange, queryRange, type Cell } from './surgeryCompositionUtils'

const cell = (overrides: Partial<Cell> = {}): Cell => ({ ...EMPTY, ...overrides })

// 2026-06: 1일=월요일. firstWeekday(6/1)=1 → 1주=1~6일, 2주=7~13일 …
const PERIOD = '2026-06'
const { lastDay } = monthRange(PERIOD) // 30

const dataMap: Record<string, Cell> = {
  '2026-06-01': cell({ visionPatients: 10, cataractPatients: 2, total: 12 }),
  '2026-06-02': cell({ visionPatients: 5, cataractPatients: 0, total: 5 }),
  '2026-06-08': cell({ visionPatients: 3, cataractPatients: 1, total: 4 }), // 2주차
}

describe('monthRange', () => {
  it('해당 월의 1일~말일과 lastDay를 반환한다', () => {
    expect(monthRange('2026-06')).toEqual({ from: '2026-06-01', to: '2026-06-30', lastDay: 30 })
    expect(monthRange('2026-02').lastDay).toBe(28)
  })
})

describe('buildSurgeryRows', () => {
  it('month: 월 합계 한 행만 반환한다', () => {
    const rows = buildSurgeryRows('month', dataMap, PERIOD, lastDay)
    expect(rows).toHaveLength(1)
    expect(rows[0].tier).toBe('month')
    expect(rows[0].label).toBe('6월')
    expect(rows[0].d.total).toBe(21) // 12 + 5 + 4
    expect(rows[0].d.visionPatients).toBe(18)
  })

  it('week: 월 합계 + 주차별 행, 일 데이터를 주차로 합산한다', () => {
    const rows = buildSurgeryRows('week', dataMap, PERIOD, lastDay)
    expect(rows[0].tier).toBe('month')
    const weekRows = rows.slice(1)
    expect(weekRows.every((r) => r.tier === 'week')).toBe(true)
    // 1주(1~6일) = 12 + 5 = 17, 2주(7~13일) = 4
    expect(weekRows[0].label).toBe('1주')
    expect(weekRows[0].d.total).toBe(17)
    expect(weekRows[1].d.total).toBe(4)
  })

  it('day: 월 합계 + 말일 수만큼 일 행, 데이터 없는 날은 muted', () => {
    const rows = buildSurgeryRows('day', dataMap, PERIOD, lastDay)
    expect(rows).toHaveLength(1 + lastDay)
    const day1 = rows[1]
    expect(day1.tier).toBe('day')
    expect(day1.label).toBe('1일')
    expect(day1.weekday).toBe('월')
    expect(day1.muted).toBeFalsy()
    const day3 = rows[3] // 6/3 데이터 없음
    expect(day3.muted).toBe(true)
  })

  it('all: 월 합계 + 주차 + 일자를 모두 포함한다', () => {
    const rows = buildSurgeryRows('all', dataMap, PERIOD, lastDay)
    const tiers = rows.map((r) => r.tier)
    expect(tiers[0]).toBe('month')
    expect(tiers.filter((t) => t === 'week').length).toBeGreaterThan(0)
    expect(tiers.filter((t) => t === 'day').length).toBe(lastDay)
  })
})

describe('queryRange', () => {
  it('주차는 그 해 전체(1주차 월요일~마지막 주차 일요일), 나머지는 선택한 달', () => {
    expect(queryRange('yearWeek', '2026-06')).toEqual({ from: '2025-12-29', to: '2027-01-03' })
    expect(queryRange('week', '2026-06')).toEqual({ from: '2026-06-01', to: '2026-06-30' })
    expect(queryRange('day', '2026-06')).toEqual({ from: '2026-06-01', to: '2026-06-30' })
  })
})

describe('buildSurgeryRows — yearWeek(주차)', () => {
  // 2026년은 ISO 53주차까지. 1주차 = 2025-12-29~2026-01-04, 53주차 = 2026-12-28~2027-01-03.
  const yearMap: Record<string, Cell> = {
    '2025-12-29': cell({ visionPatients: 2, total: 2 }), // 2026년 1주차(전년 12월)
    '2026-01-02': cell({ visionPatients: 3, total: 3 }), // 2026년 1주차
    '2026-06-01': cell({ visionPatients: 7, cataractPatients: 1, total: 8 }), // 23주차
    '2026-12-28': cell({ visionPatients: 4, total: 4 }), // 53주차
  }

  it('연 합계 + 01주차~53주차를 빠짐없이 만든다', () => {
    const rows = buildSurgeryRows('yearWeek', yearMap, '2026-06', 30)
    expect(rows).toHaveLength(1 + 53)
    expect(rows[0]).toMatchObject({ tier: 'month', label: '2026년' })
    expect(rows[0].d.total).toBe(17) // 2 + 3 + 8 + 4 — 연 합계 = 주차 합계
    expect(rows[1].label).toBe('01주차')
    expect(rows[53].label).toBe('53주차')
    expect(rows.slice(1).every((r) => r.tier === 'week')).toBe(true)
  })

  it('1주차는 전년 12월, 마지막 주차는 다음 해 1월을 포함한다', () => {
    const rows = buildSurgeryRows('yearWeek', yearMap, '2026-06', 30)
    expect(rows[1].range).toBe('12/29~1/4')
    expect(rows[1].d.total).toBe(5) // 2025-12-29 + 2026-01-02
    expect(rows[53].range).toBe('12/28~1/3')
    expect(rows[53].d.total).toBe(4)
  })

  it('데이터 없는 주차도 행은 남기고 muted 처리한다', () => {
    const rows = buildSurgeryRows('yearWeek', yearMap, '2026-06', 30)
    const week23 = rows[23]
    expect(week23.label).toBe('23주차')
    expect(week23.range).toBe('6/1~6/7')
    expect(week23.d.total).toBe(8)
    expect(week23.muted).toBe(false)
    expect(rows[2].muted).toBe(true) // 02주차 — 데이터 없음
  })

  it('조회 월이 달라도 같은 해면 같은 주차 표가 나온다', () => {
    const june = buildSurgeryRows('yearWeek', yearMap, '2026-06', 30)
    const january = buildSurgeryRows('yearWeek', yearMap, '2026-01', 31)
    expect(january).toEqual(june)
  })
})
