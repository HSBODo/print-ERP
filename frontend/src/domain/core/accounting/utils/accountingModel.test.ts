import { describe, expect, it } from 'vitest'
import type { MedicalReceipt } from '../type/accounting'
import { dataStamp, medicalNetRevenue } from './accountingModel'
import { buildMedicalChart, buildVisionChart, chartYears } from './accountingChartModel'

describe('회계 프런트 집계 모델', () => {
  it('진료 실수납합계는 수납과 미수를 더하고 환불을 뺀다', () => {
    const paid = { serialNo: 1, actualPaid: 150, outstandingRecovered: 40, refund: 0 } as MedicalReceipt
    const refunded = { serialNo: 98, actualPaid: 0, outstandingRecovered: 0, refund: 70 } as MedicalReceipt
    expect(medicalNetRevenue(paid)).toBe(190)
    expect(medicalNetRevenue(refunded)).toBe(-70)
  })

  it('진료 매출 그래프는 단일 연도에서 네 가지 금액 지표를 구성한다', () => {
    const view = buildMedicalChart([
      { year: 2026, month: 1, count: 10, net: 1000, claim: 200, salaryTotal: 300, nonCovered: 700 },
    ], [2026])

    expect(view.lines.map((line) => line.label)).toEqual(['실수납합계', '공단청구액', '급여총액', '비급여'])
    expect(view.tableRows[0].values[0]).toBe(10)
    expect(view.tableRows[0].values[1]).toBeNull()
  })

  it('연도 비교와 시력교정 그래프는 선택한 연도별 월간 선을 만든다', () => {
    const medical = buildMedicalChart([
      { year: 2025, month: 1, count: 8, net: 800, claim: 100, salaryTotal: 200, nonCovered: 600 },
      { year: 2026, month: 1, count: 10, net: 1000, claim: 200, salaryTotal: 300, nonCovered: 700 },
    ], [2025, 2026])
    const vision = buildVisionChart([
      { year: 2025, month: 1, count: 4, amount: 400 },
      { year: 2026, month: 1, count: 5, amount: 500 },
    ], [2025, 2026])

    expect(medical.lines.map((line) => line.label)).toEqual(['2025년', '2026년'])
    expect(medical.lines[1].values[0]).toBe(1000)
    expect(vision.lines.map((line) => line.label)).toEqual(['2025년', '2026년'])
    expect(vision.tableRows).toHaveLength(4)
  })

  it('연도 후보는 집계 시작 연도부터 올해까지, 적재 전이면 올해만', () => {
    const today = new Date(2026, 8, 15)
    expect(chartYears(2023, today)).toEqual(['2023', '2024', '2025', '2026'])
    expect(chartYears(null, today)).toEqual(['2026'])
  })

  it('데이터 기준 표기는 적재 전이면 미상', () => {
    expect(dataStamp(null)).toEqual({ date: '미상', range: '' })
    expect(dataStamp('2026-09-15', '2026-01-01', '2026-09-14')).toEqual({ date: '2026-09-15', range: '2026-01-01~2026-09-14' })
  })
})
