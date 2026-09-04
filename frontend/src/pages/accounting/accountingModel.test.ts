import { describe, expect, it } from 'vitest'
import type { MedicalReceipt, VisionReceipt } from '@/api/accounting'
import { medicalNetRevenue, periodKey, visionSummary } from './accountingModel'
import { buildMedicalChart, buildVisionChart } from './accountingChartModel'

describe('회계 프런트 집계 모델', () => {
  it('진료 실수납합계는 수납과 미수를 더하고 환불을 뺀다', () => {
    const paid = { serialNo: 1, actualPaid: 150, outstandingRecovered: 40, refund: 0 } as MedicalReceipt
    const refunded = { serialNo: 98, actualPaid: 0, outstandingRecovered: 0, refund: 70 } as MedicalReceipt
    expect(medicalNetRevenue(paid)).toBe(190)
    expect(medicalNetRevenue(refunded)).toBe(-70)
  })

  it('주차는 월요일 시작일로 묶는다', () => {
    expect(periodKey('2026-09-04', 'weekly')).toBe('2026-08-31')
  })

  it('시력교정 취소행은 건수와 매출에서 차감된다', () => {
    const rows = [
      { procedure: '라식', status: '결제처리', paymentMethod: '카드', amount: 300 } as VisionReceipt,
      { procedure: '라식', status: '결제취소', paymentMethod: '카드', amount: -100 } as VisionReceipt,
    ]
    expect(visionSummary(rows)).toEqual([
      { procedure: '라식', count: 0, card: 200, cashLike: 0, total: 200 },
    ])
  })

  it('진료 매출 그래프는 단일 연도에서 네 가지 금액 지표를 구성한다', () => {
    const view = buildMedicalChart([
      { year: 2026, month: 1, count: 10, net: 1000, claim: 200, salaryTotal: 300, nonCovered: 700 },
    ], [2026], '전체')

    expect(view.lines.map((line) => line.label)).toEqual(['실수납합계', '공단청구액', '급여총액', '비급여'])
    expect(view.tableRows[0].values[0]).toBe(10)
  })

  it('연도 비교와 시력교정 그래프는 선택한 연도별 월간 선을 만든다', () => {
    const medical = buildMedicalChart([
      { year: 2025, month: 1, count: 8, net: 800, claim: 100, salaryTotal: 200, nonCovered: 600 },
      { year: 2026, month: 1, count: 10, net: 1000, claim: 200, salaryTotal: 300, nonCovered: 700 },
    ], [2025, 2026], '백내장')
    const vision = buildVisionChart([
      { year: 2025, month: 1, count: 4, amount: 400 },
      { year: 2026, month: 1, count: 5, amount: 500 },
    ], [2025, 2026])

    expect(medical.lines.map((line) => line.label)).toEqual(['2025년', '2026년'])
    expect(medical.lines[1].values[0]).toBe(1000)
    expect(vision.lines.map((line) => line.label)).toEqual(['2025년', '2026년'])
    expect(vision.tableRows).toHaveLength(4)
  })
})
