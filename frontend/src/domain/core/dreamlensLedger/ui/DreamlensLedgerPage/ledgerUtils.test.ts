import { describe, expect, it } from 'vitest'

import type { DreamlensLedgerRow } from '../../type/api'
import { csvColumnsOf } from './ledgerUtils'

/**
 * CSV 는 파일로 남아 메신저로 전달되므로 개인정보가 조용히 덜 가려지면 그대로 유출된다.
 * 픽스처는 합성 데이터다.
 */
describe('CSV 내보내기 마스킹', () => {
  const rowWith = (
    overrides: Partial<DreamlensLedgerRow> = {},
  ): DreamlensLedgerRow =>
    ({
      id: 1,
      entryDate: '2026-08-02',
      customerName: '홍길동',
      customerNo: '2234528',
      examiner: '한지희',
      purchaseType: '서울 마포구 서교동 476-49 201호',
      dlNewRevenue: 900_000,
      totalRevenue: 900_000,
      ...overrides,
    }) as DreamlensLedgerRow

  const cell = (key: string, row: DreamlensLedgerRow) =>
    String(csvColumnsOf().find((column) => column.key === key)!.csv!(row, 1))

  it('고객명은 가운데를 가린다', () => {
    expect(cell('customerName', rowWith())).toBe('홍*동')
  })

  it('실제 주소는 상세주소를 가린다', () => {
    expect(cell('purchaseType', rowWith())).toBe('서울 마포구 ***')
  })

  it('구매 구분 값은 분석에 필요하므로 그대로 둔다', () => {
    const row = rowWith({ purchaseType: '본원 배송(택배발송)' })
    expect(cell('purchaseType', row)).toBe('본원 배송(택배발송)')
  })

  it('고객번호는 행 대조에 필요해 마스킹하지 않는다(차트번호와 동일 규약)', () => {
    expect(cell('customerNo', rowWith())).toBe('2234528')
  })
})
