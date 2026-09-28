import { describe, expect, it, vi } from 'vitest'

import { buildStatsCsv } from './reservationStatsCsv'
import { periodRange } from './reservationStatsDateRange'
import { buildDisplayRowsFromCounts, type StatsDisplayRow } from './reservationStatsRows'
import { computeSummaryRow } from './reservationStatsSummary'

type Counts = {
  inbound: number
  reservation: number
  visit: number
  noShowReservation: number
  cancel: number
}

type ChannelRow = {
  label: string
  inbound: number
  reservation: number
}

type Row = StatsDisplayRow<ChannelRow>

const keys: (keyof Counts)[] = ['inbound', 'reservation', 'visit', 'noShowReservation', 'cancel']

const zeroCounts = (): Counts => ({
  inbound: 0,
  reservation: 0,
  visit: 0,
  noShowReservation: 0,
  cancel: 0,
})

const sumCounts = (rows: readonly Counts[]): Counts => {
  const acc = zeroCounts()
  for (const row of rows) {
    for (const key of keys) acc[key] += row[key]
  }
  return acc
}

const isZeroCounts = (counts: Counts): boolean => keys.every((key) => counts[key] === 0)

const buildRow = (
  counts: Counts,
  label: string,
  tier: Row['tier'],
  extra: Partial<Row> = {},
): Row => ({
  label,
  tier,
  isTotal: tier === 'month',
  channel: {
    label,
    inbound: counts.inbound,
    reservation: counts.reservation,
  },
  summary: computeSummaryRow(counts, label),
  ...extra,
})

describe('reservation stats shared helpers', () => {
  it('builds month, week, day and all rows with the same calendar bucket rules', () => {
    const dailies = [
      { date: '2026-06-01', inbound: 3, reservation: 1, visit: 1, noShowReservation: 0, cancel: 0 },
      { date: '2026-06-08', inbound: 5, reservation: 2, visit: 1, noShowReservation: 1, cancel: 0 },
    ]
    const deps = { zeroCounts, sumCounts, isZeroCounts, buildRow }

    expect(buildDisplayRowsFromCounts('month', dailies, '2026-06', 8, deps)).toMatchObject([
      { label: '6월', tier: 'month', channel: { inbound: 8, reservation: 3 } },
    ])
    expect(buildDisplayRowsFromCounts('week', dailies, '2026-06', 8, deps).map((row) => row.label)).toEqual([
      'TOTAL',
      '1주',
      '2주',
    ])
    // 주차 = ISO 8601. 2026-06-01 은 ISO 23주, 2026-06-08 은 ISO 24주 → '23주차', '24주차'.
    expect(buildDisplayRowsFromCounts('yearWeek', dailies, '2026-06', 8, deps).map((row) => row.label)).toEqual([
      'TOTAL',
      '23주차',
      '24주차',
    ])
    expect(buildDisplayRowsFromCounts('day', dailies, '2026-06', 2, deps)).toMatchObject([
      { label: 'TOTAL', tier: 'month' },
      { label: '1일', weekday: '월', muted: false, weekStart: true },
      { label: '2일', weekday: '화', muted: true, weekStart: false },
    ])
    expect(buildDisplayRowsFromCounts('all', dailies, '2026-06', 2, deps).map((row) => row.tier)).toEqual([
      'month',
      'week',
      'day',
      'day',
    ])
  })

  it('builds CSV from explicit channel groups and blanks muted rows', () => {
    const rows: Row[] = [
      buildRow({ inbound: 10, reservation: 4, visit: 3, noShowReservation: 1, cancel: 0 }, 'TOTAL', 'month'),
      buildRow({ inbound: 0, reservation: 0, visit: 0, noShowReservation: 0, cancel: 0 }, '7일', 'day', {
        weekday: '일',
        muted: true,
      }),
    ]

    expect(
      buildStatsCsv(rows, {
        leading: { header: '총예약', value: (row) => row.channel.reservation },
        columnGroups: [
          {
            label: '콜',
            columns: [
              { key: 'inbound', label: '인입' },
              { key: 'reservation', label: '예약' },
            ],
          },
        ],
        summaryColumns: [
          { key: 'totalReservationCount', label: '총예약건' },
          { key: 'visitRate', label: '내원율' },
        ],
      }).split('\r\n'),
    ).toEqual([
      '구분,총예약,콜>인입,콜>예약,종합>총예약건,종합>내원율',
      'TOTAL,4,10,4,4,75',
      '7일(일),,,,,',
    ])
  })

  it('keeps the in-progress month range at yesterday and past months at month end', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-24T09:00:00+09:00'))

    expect(periodRange('2026-06')).toEqual({ from: '2026-06-01', to: '2026-06-23', lastDay: 23 })
    expect(periodRange('2026-05')).toEqual({ from: '2026-05-01', to: '2026-05-31', lastDay: 31 })

    vi.useRealTimers()
  })
})
