import { describe, expect, it } from 'vitest'
import type { VisionReceipt } from '../../type/accounting'
import {
  buildVisionRevenueSummary,
  summaryCardTotal,
  summaryRowValues,
  VISION_SUMMARY_ROWS,
} from './visionRevenueSummaryModel'

const receipt = (paymentMethod: VisionReceipt['paymentMethod'], acquirer: string, itemAmounts: VisionReceipt['itemAmounts']) => ({
  paymentMethod,
  acquirer,
  itemAmounts,
}) as VisionReceipt

describe('시력교정 매출 집계 모델', () => {
  it('카드는 매입사 열에, 카드 외 결제는 현금 열에 합산한다', () => {
    const summary = buildVisionRevenueSummary([
      receipt('카드', '국민', { 수술: 300 } as VisionReceipt['itemAmounts']),
      receipt('현금영수', '', { 수술: 120 } as VisionReceipt['itemAmounts']),
    ])
    const surgery = VISION_SUMMARY_ROWS.find((row) => row.key === '수술')!
    const values = summaryRowValues(summary, surgery)

    expect(summary.count).toBe(2)
    expect(values[summary.columns.indexOf('현금')]).toBe(120)
    expect(values[summary.columns.indexOf('국민')]).toBe(300)
    expect(summaryCardTotal(summary, values)).toBe(300)
  })

  it('면세와 과세 항목을 분리하고 전체 합계를 보존한다', () => {
    const summary = buildVisionRevenueSummary([
      receipt('카드', '신한', { 수술: 1_000 } as VisionReceipt['itemAmounts']),
      receipt('카드', '신한', { 올코드라이아이: 110 } as VisionReceipt['itemAmounts']),
    ])

    expect(summary.freeTotals['신한']).toBe(1_000)
    expect(summary.taxedTotals['신한']).toBe(110)
    expect(summary.columnTotals['신한']).toBe(1_110)
  })

  it('회계 원본과 같은 고정 행 순서를 유지한다', () => {
    expect(VISION_SUMMARY_ROWS.map((row) => row.label)).toEqual([
      '수술', '선결제', 'PIOL렌즈주문', 'PRP', '검사비', 'DNA', '기타', 'D/L', 'D/L 용품', 'H/L', '미분류',
      '패키지', '보안경', '키즈아이', '올코어아레즈투', '올코어vitc', '올코드라이아이', 'Dr.PNT',
      '올코어유산균', '글라우포뮬러', '플로터포뮬러',
    ])
  })
})
