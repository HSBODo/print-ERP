import { describe, expect, it } from 'vitest'
import { weeksOfYear, weeksOfMonth } from './reportWeeks'
import { buildWeeklyReportCsv, type WeeklyCsvRowSpec } from './weeklyReportCsv'

const ROWS: WeeklyCsvRowSpec[] = [
  { group: '예약', label: '예약 종합', series: 'reservations' },
  { group: '비율', label: '중단율', series: 'stopRate', format: 'percent', fractionDigits: 1 },
]

const weeks2026 = weeksOfYear(2026)

/** n주차 위치에 값을 넣은 배열 (weeks 길이만큼, 나머지는 null) */
const seriesOf = (weeks: typeof weeks2026, values: Record<number, number | null>) =>
  weeks.map((w) => (w.week in values ? values[w.week] : null))

describe('buildWeeklyReportCsv', () => {
  it('헤더는 그룹·지표·단위·연도 + 주차 열이고 2자리로 패딩된다', () => {
    const csv = buildWeeklyReportCsv({
      years: [2026],
      weeks: weeks2026,
      charts: { reservations: { 2026: seriesOf(weeks2026, { 1: 10 }) } },
      rows: ROWS,
    })
    const header = csv.split('\r\n')[0].split(',')
    expect(header.slice(0, 4)).toEqual(['그룹', '지표', '단위', '연도'])
    expect(header[4]).toBe('01주차')
    expect(header[header.length - 1]).toBe(`${weeks2026.length}주차`)
  })

  it('2026 은 ISO 53주차까지 열이 만들어진다', () => {
    const csv = buildWeeklyReportCsv({
      years: [2026], weeks: weeks2026,
      charts: { reservations: { 2026: seriesOf(weeks2026, {}) } },
      rows: ROWS,
    })
    const header = csv.split('\r\n')[0].split(',')
    expect(weeks2026.length).toBe(53)
    expect(header).toHaveLength(4 + 53)
    expect(header[4 + 52]).toBe('53주차')
  })

  it('월을 고르면 그 달에 걸친 주차 열만 나온다', () => {
    const julyWeeks = weeksOfMonth(weeks2026, 7)
    const csv = buildWeeklyReportCsv({
      years: [2026], weeks: julyWeeks,
      charts: { reservations: { 2026: seriesOf(julyWeeks, {}) } },
      rows: ROWS,
    })
    const header = csv.split('\r\n')[0].split(',')
    expect(header).toHaveLength(4 + julyWeeks.length)
    expect(header.length).toBeLessThan(4 + 53)
    expect(header[4]).toBe(`${String(julyWeeks[0].week).padStart(2, '0')}주차`)
  })

  it('연도별로 행이 하나씩 생기고 오름차순 정렬된다', () => {
    const csv = buildWeeklyReportCsv({
      years: [2026, 2025],
      weeks: weeks2026,
      charts: {
        reservations: {
          2025: seriesOf(weeks2026, { 1: 100 }),
          2026: seriesOf(weeks2026, { 1: 200 }),
        },
      },
      rows: [ROWS[0]],
    })
    const lines = csv.split('\r\n').slice(1)
    expect(lines).toHaveLength(2)
    expect(lines[0].startsWith('예약,예약 종합,건,2025,100')).toBe(true)
    expect(lines[1].startsWith('예약,예약 종합,건,2026,200')).toBe(true)
  })

  it('퍼센트는 fractionDigits 자리로, 건수는 원값, null 은 빈칸', () => {
    const csv = buildWeeklyReportCsv({
      years: [2026], weeks: weeks2026,
      charts: {
        reservations: { 2026: seriesOf(weeks2026, { 1: 7 }) },
        stopRate: { 2026: seriesOf(weeks2026, { 1: 6.37 }) },
      },
      rows: ROWS,
    })
    const [resv, stop] = csv.split('\r\n').slice(1)
    expect(resv.split(',')[4]).toBe('7')
    expect(stop.split(',')[4]).toBe('6.4')
    // 값이 없는 2주차는 빈칸
    expect(resv.split(',')[5]).toBe('')
  })

  it('charts 에 없는 series 는 행을 만들지 않는다', () => {
    const csv = buildWeeklyReportCsv({
      years: [2026], weeks: weeks2026,
      charts: { reservations: { 2026: seriesOf(weeks2026, { 1: 1 }) } },
      rows: ROWS, // stopRate 는 charts 에 없음
    })
    expect(csv.split('\r\n')).toHaveLength(2) // 헤더 + 예약 1행
  })
})
