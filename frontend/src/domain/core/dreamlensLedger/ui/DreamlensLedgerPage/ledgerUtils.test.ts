import { describe, expect, it } from 'vitest'

import type { DreamlensLedgerRow } from '../../type/api'
import {
  csvColumnsOf,
  isoWeekNumbers,
  toMonthStart,
  toMonthValue,
  toWeekEnd,
  toWeekStart,
  toWeekValue,
} from './ledgerUtils'

/**
 * 장부 툴바의 기간 단위 변환.
 *
 * 주차는 ISO 8601(월~일, 첫 목요일이 든 주가 1주차) — 주차 레포트·예약통계와 같은 기준이다.
 * '그 달의 주차'(월 경계 분할 방식)와 헷갈리면 연말·연초에서 한 주씩 어긋나므로 경계를 고정해 둔다.
 */
describe('드림렌즈 장부 기간 헬퍼', () => {
  describe('주차(ISO 8601)', () => {
    it('2026년 1주차는 전년 12월을 문다', () => {
      // 2026-01-01 은 목요일 → ISO 규칙상 2026년 1주차
      expect(toWeekValue('2026-01-01')).toBe('2026-W01')
      expect(toWeekStart('2026-W01')).toBe('2025-12-29') // 월요일
      expect(toWeekEnd('2026-W01')).toBe('2026-01-04') // 일요일
    })

    it('전년 12월 말일도 다음 해 1주차로 잡힌다', () => {
      expect(toWeekValue('2025-12-31')).toBe('2026-W01')
    })

    it('주 중간 아무 날이나 같은 주차로 모인다', () => {
      const week = toWeekValue('2026-08-03') // 월요일
      expect(week).toBe('2026-W32')
      expect(toWeekValue('2026-08-09')).toBe(week) // 같은 주 일요일
      expect(toWeekValue('2026-08-10')).toBe('2026-W33') // 다음 주 월요일
    })

    it('주차 → 시작일 → 주차 왕복이 보존된다', () => {
      for (const week of ['2026-W01', '2026-W23', '2026-W32', '2025-W52']) {
        expect(toWeekValue(toWeekStart(week))).toBe(week)
      }
    })

    it('시작일은 항상 월요일이다', () => {
      for (const week of ['2026-W01', '2026-W10', '2026-W32', '2025-W52']) {
        const [y, m, d] = toWeekStart(week).split('-').map(Number)
        expect(new Date(y, m - 1, d).getDay()).toBe(1) // 1 = 월요일
      }
    })

    it('미래 주차를 골라도 시작일 <= 종료일 이 깨지지 않는다', () => {
      // 종료일을 오늘로 자르면 미래 주에서 from > to 가 되어 조회가 막힌다.
      for (const week of ['2026-W52', '2026-W40', '2026-W01']) {
        expect(toWeekStart(week) <= toWeekEnd(week)).toBe(true)
      }
      expect(toWeekEnd('2026-W52')).toBe('2026-12-27') // 자르지 않고 그 주 일요일 그대로
    })

    it('연도별 주차 수는 52 또는 53 이다', () => {
      for (const year of [2020, 2021, 2024, 2025, 2026]) {
        expect(isoWeekNumbers(year).length).toBeGreaterThanOrEqual(52)
        expect(isoWeekNumbers(year).length).toBeLessThanOrEqual(53)
        expect(isoWeekNumbers(year)[0]).toBe(1)
      }
    })
  })

  describe('월별', () => {
    it('시작일이 속한 달로 맞춰진다', () => {
      expect(toMonthValue('2026-08-03')).toBe('2026-08')
      expect(toMonthStart('2026-08')).toBe('2026-08-01')
    })
  })
})

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
