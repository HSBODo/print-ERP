import { describe, expect, it } from 'vitest'

import {
  createCountHelpers,
  monthFullLabel,
  monthShortLabel,
  pct1,
  pctInt,
  weekOf,
  weekdayKo,
} from './reservationStatsCore'

describe('reservation stats core helpers', () => {
  it('formats month labels from YYYY-MM periods', () => {
    expect(monthShortLabel('2026-03')).toBe('3월')
    expect(monthFullLabel('2026-03')).toBe('2026년 3월')
  })

  it('maps weekday indexes to Korean labels', () => {
    expect(weekdayKo(0)).toBe('일')
    expect(weekdayKo(6)).toBe('토')
    expect(weekdayKo(7)).toBe('')
  })

  it('calculates 0-based calendar week indexes', () => {
    expect(weekOf(1, 0)).toBe(0)
    expect(weekOf(7, 0)).toBe(0)
    expect(weekOf(8, 0)).toBe(1)
    expect(weekOf(1, 3)).toBe(0)
    expect(weekOf(5, 3)).toBe(1)
  })

  it('calculates integer and one-decimal percentages with zero-denominator guards', () => {
    expect(pctInt(2, 3)).toBe(67)
    expect(pctInt(1, 0)).toBe(0)
    expect(pct1(2, 3)).toBe(66.7)
    expect(pct1(1, 0)).toBe(0)
  })

  it('creates count helpers for domain-specific numeric records', () => {
    type Counts = {
      inbound: number
      reservation: number
      cancel: number
    }

    const { zeroCounts, sumCounts, isZeroCounts } = createCountHelpers<Counts>([
      'inbound',
      'reservation',
      'cancel',
    ])

    expect(zeroCounts()).toEqual({ inbound: 0, reservation: 0, cancel: 0 })
    expect(isZeroCounts({ inbound: 0, reservation: 0, cancel: 0 })).toBe(true)
    expect(isZeroCounts({ inbound: 1, reservation: 0, cancel: 0 })).toBe(false)
    expect(
      sumCounts([
        { inbound: 10, reservation: 3, cancel: 1 },
        { inbound: 5, reservation: 2, cancel: 0 },
      ]),
    ).toEqual({ inbound: 15, reservation: 5, cancel: 1 })
  })
})
