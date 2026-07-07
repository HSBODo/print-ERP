import { describe, expect, it } from 'vitest'

import { buildMonthlyReportCsv } from './monthlyReportCsv'
import type { StopReasonMonthlyItem } from '@/api/consultation'

const emptyStop: StopReasonMonthlyItem = {
  year: 2026,
  month: 1,
  recommendX: 0,
  lensImpossible: 0,
  keratoconus: 0,
  avellino: 0,
  glaucoma: 0,
  visionChange: 0,
  other: 0,
  total: 0,
}

const blank12 = (): Array<number | null> => Array.from({ length: 12 }, () => null)

const run = () =>
  buildMonthlyReportCsv({
    years: [2026, 2025], // 정렬되어야 함(2025 먼저)
    currentYear: 2026,
    charts: {
      reservations: {
        2025: Array.from({ length: 12 }, (_, i) => 100 + i),
        2026: [200, 201, null, null, null, null, null, null, null, null, null, null],
      },
      ratioGeneral: { 2026: [51.8128, ...Array<number | null>(11).fill(null)] },
      stopRate: { 2026: [6.37, ...Array<number | null>(11).fill(null)] },
      // examCount 등 나머지 키는 미제공 → 행이 생기지 않아야 함
    } as Record<string, unknown>,
    success: {
      all: [79.1, ...Array<number | null>(11).fill(null)],
      oneday: blank12(),
      general: blank12(),
    },
    stopReasonByMonth: [{ ...emptyStop, recommendX: 23, total: 100 }, ...Array<StopReasonMonthlyItem | null>(11).fill(null)],
  })

const lines = () => run().split('\r\n')
const row = (prefix: string) => lines().find((line) => line.startsWith(prefix))

describe('buildMonthlyReportCsv', () => {
  it('헤더는 그룹·지표·단위·연도 + 1~12월', () => {
    expect(lines()[0]).toBe('그룹,지표,단위,연도,1월,2월,3월,4월,5월,6월,7월,8월,9월,10월,11월,12월')
  })

  it('series는 연도 오름차순으로 행을 만들고 모든 달을 채운다', () => {
    expect(row('예약,예약 종합(콜+온라인),건,2025,')).toBe(
      '예약,예약 종합(콜+온라인),건,2025,100,101,102,103,104,105,106,107,108,109,110,111',
    )
    const all = lines()
    expect(all.indexOf(row('예약,예약 종합(콜+온라인),건,2025,')!)).toBeLessThan(
      all.indexOf(row('예약,예약 종합(콜+온라인),건,2026,')!),
    )
  })

  it('null 달은 빈칸으로 직렬화', () => {
    const cells = row('예약,예약 종합(콜+온라인),건,2026,')!.split(',').slice(4)
    expect(cells).toEqual(['200', '201', '', '', '', '', '', '', '', '', '', ''])
  })

  it('비율(%)은 화면 차트와 동일하게 정수 반올림', () => {
    const cells = row('비율,일반검사 비율,%,2026,')!.split(',').slice(4)
    // 51.8128 → Math.round → 52 (화면 차트 표시와 일치)
    expect(cells[0]).toBe('52')
  })

  it('중단율은 소수점 첫째 자리까지 직렬화', () => {
    const cells = row('중단,중단율,%,2026,')!.split(',').slice(4)
    expect(cells[0]).toBe('6.4')
  })

  it('상담성공률·중단사유는 당해연도 행으로 포함', () => {
    expect(row('전환&성공,상담성공률(전체),%,2026,')!.split(',')[4]).toBe('79')
    expect(row('중단,중단사유-수술권유X,건,2026,')!.split(',')[4]).toBe('23')
    expect(row('중단,중단사유-합계,건,2026,')!.split(',')[4]).toBe('100')
  })

  it('charts에 없는 지표는 건너뛴다', () => {
    expect(lines().some((line) => line.includes('검사수(전체)'))).toBe(false)
  })

  it('선택 범위에 당해연도가 없으면 성공률·중단사유를 제외', () => {
    const csv = buildMonthlyReportCsv({
      years: [2025],
      currentYear: 2026,
      charts: { reservations: { 2025: Array.from({ length: 12 }, (_, i) => i) } } as Record<string, unknown>,
      success: { all: blank12(), oneday: blank12(), general: blank12() },
      stopReasonByMonth: Array<StopReasonMonthlyItem | null>(12).fill(null),
    })
    expect(csv).not.toContain('상담성공률')
    expect(csv).not.toContain('중단사유')
    expect(csv).toContain('예약 종합(콜+온라인),건,2025,')
  })

  it('출력 순서는 LNB 목차 순서를 따른다(비율→성공률→중단율→중단사유→수술→외래)', () => {
    const csv = buildMonthlyReportCsv({
      years: [2026],
      currentYear: 2026,
      charts: {
        ratioGeneral: { 2026: blank12() },
        stopRate: { 2026: blank12() },
        cataractSurgery: { 2026: blank12() },
        outpatient: { 2026: blank12() },
      } as Record<string, unknown>,
      success: { all: blank12(), oneday: blank12(), general: blank12() },
      stopReasonByMonth: Array<StopReasonMonthlyItem | null>(12).fill(null),
    })
    const at = (s: string) => csv.indexOf(s)
    expect(at('일반검사 비율')).toBeLessThan(at('상담성공률(전체)'))
    expect(at('상담성공률(전체)')).toBeLessThan(at('중단율'))
    expect(at('중단율')).toBeLessThan(at('중단사유-수술권유X'))
    expect(at('중단사유-합계')).toBeLessThan(at('백내장 수술'))
    expect(at('백내장 수술')).toBeLessThan(at('외래수'))
  })
})
