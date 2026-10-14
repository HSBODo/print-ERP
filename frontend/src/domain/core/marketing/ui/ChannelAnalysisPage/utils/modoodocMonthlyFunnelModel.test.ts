import { describe, expect, it } from 'vitest'

import type { ReservationChannelFunnelItem } from '../../../type/api'
import {
  buildYearMonthRanges,
  findModoodocFunnel,
  toModoodocMonthlyRow,
} from './modoodocMonthlyFunnelModel'

describe('모두닥 월별 퍼널 모델', () => {
  it('2026년 1월부터 12월까지 정확한 월 범위를 만든다', () => {
    const ranges = buildYearMonthRanges(2026)

    expect(ranges).toHaveLength(12)
    expect(ranges[0]).toEqual({
      month: 1,
      from: '2026-01-01',
      to: '2026-01-31',
    })
    expect(ranges[1]).toEqual({
      month: 2,
      from: '2026-02-01',
      to: '2026-02-28',
    })
    expect(ranges[11]).toEqual({
      month: 12,
      from: '2026-12-01',
      to: '2026-12-31',
    })
  })

  it('모두닥 채널의 예약부터 수술완료까지 건수를 월 행으로 옮긴다', () => {
    const source = {
      reserved: 120,
      notCancel: 110,
      visited: 80,
      examined: 75,
      notStop: 70,
      surgery: 45,
      surgeryDone: 40,
    }

    expect(toModoodocMonthlyRow(7, source)).toEqual({
      month: '7월',
      monthNumber: 7,
      ...source,
    })
  })

  it('모두닥 행이 없으면 모든 단계를 0건으로 유지한다', () => {
    expect(toModoodocMonthlyRow(12)).toEqual({
      month: '12월',
      monthNumber: 12,
      reserved: 0,
      notCancel: 0,
      visited: 0,
      examined: 0,
      notStop: 0,
      surgery: 0,
      surgeryDone: 0,
    })
  })

  it('채널명 주변 공백을 제거해서 모두닥 행을 찾는다', () => {
    const row = {
      channel: ' 모두닥 ',
      reserved: 3,
    } as ReservationChannelFunnelItem

    expect(findModoodocFunnel([row])?.reserved).toBe(3)
  })
})
