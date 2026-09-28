import { describe, expect, it } from 'vitest'

import { reservationStatsSourceLabel } from './reservationStatsMeta'

describe('reservation stats response meta', () => {
  it('source와 locked 상태를 운영 라벨로 변환한다', () => {
    expect(reservationStatsSourceLabel({ source: 'SNAPSHOT', period: '2026-06', locked: true })).toBe('PDF 고정')
    expect(reservationStatsSourceLabel({ source: 'SNAPSHOT', period: '2026-06', locked: false })).toBe('스냅샷')
    expect(reservationStatsSourceLabel({ source: 'LIVE', period: '2026-06' })).toBe('라이브')
    expect(reservationStatsSourceLabel({ source: 'UNAVAILABLE', period: '2026-06' })).toBe('미연결')
  })
})
