import { describe, expect, it } from 'vitest'

import { toMonthStart, toMonthValue, toWeekStart, toWeekValue, toWeekEnd } from './ledgerUtils'

/**
 * 장부 툴바의 기간 단위 변환.
 *
 * 주차는 ISO 8601(월~일, 첫 목요일이 든 주가 1주차) — 주차 레포트·예약통계와 같은 기준이다.
 * '그 달의 주차'(utils/weekBucket)와 헷갈리면 연말·연초에서 한 주씩 어긋나므로 경계를 고정해 둔다.
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
  })

  describe('월별', () => {
    it('시작일이 속한 달로 맞춰진다', () => {
      expect(toMonthValue('2026-08-03')).toBe('2026-08')
      expect(toMonthStart('2026-08')).toBe('2026-08-01')
    })
  })
})
