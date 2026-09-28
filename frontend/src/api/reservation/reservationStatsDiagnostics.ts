import { z } from 'zod'
import { toCsv } from '#shared/utils/csv'

export const reservationStatsDiffItemSchema = z.object({
  date: z.string(),
  field: z.string(),
  label: z.string(),
  snapshotValue: z.number().nullable(),
  liveValue: z.number().nullable(),
  delta: z.number().nullable(),
})

export const reservationStatsDiffSchema = z.object({
  period: z.string(),
  snapshotExists: z.boolean(),
  liveFrom: z.string().nullable(),
  liveTo: z.string().nullable(),
  diffCount: z.number(),
  diffs: z.array(reservationStatsDiffItemSchema),
})

export const reservationStatsDrillDownRowSchema = z.object({
  date: z.string(),
  field: z.string(),
  source: z.string(),
  gb: z.string(),
  gb2: z.string(),
  primaryKey: z.string().nullable(),
  custNum: z.string().nullable().optional(),
  reserveNum: z.string().nullable().optional(),
  reserveState: z.string().nullable().optional(),
  exclusionReasonCandidate: z.string().nullable().optional(),
  contribution: z.number(),
})

export const reservationStatsDrillDownSchema = z.object({
  period: z.string(),
  date: z.string(),
  field: z.string(),
  label: z.string(),
  snapshotExists: z.boolean(),
  snapshotValue: z.number().nullable(),
  liveValue: z.number().nullable(),
  delta: z.number().nullable(),
  rowCount: z.number(),
  rows: z.array(reservationStatsDrillDownRowSchema),
})

export const reservationStatsParityItemSchema = z.object({
  date: z.string(),
  field: z.string(),
  label: z.string(),
  dailyValue: z.number(),
  drillDownValue: z.number(),
  delta: z.number(),
  rowCount: z.number(),
})

export const reservationStatsParitySchema = z.object({
  period: z.string(),
  field: z.string(),
  label: z.string(),
  liveFrom: z.string(),
  liveTo: z.string(),
  mismatchCount: z.number(),
  items: z.array(reservationStatsParityItemSchema),
})

export type ReservationStatsDiffItem = z.infer<typeof reservationStatsDiffItemSchema>
export type ReservationStatsDiff = z.infer<typeof reservationStatsDiffSchema>
export type ReservationStatsDrillDownRow = z.infer<typeof reservationStatsDrillDownRowSchema>
export type ReservationStatsDrillDown = z.infer<typeof reservationStatsDrillDownSchema>
export type ReservationStatsParityItem = z.infer<typeof reservationStatsParityItemSchema>
export type ReservationStatsParity = z.infer<typeof reservationStatsParitySchema>

type DrillDownPathBuilder = (item: ReservationStatsDiffItem) => string

const formatNullable = (value: number | null): string | number => value ?? ''

export const buildReservationStatsDiffCsv = (
  diff: ReservationStatsDiff,
  drillDownPathFor?: DrillDownPathBuilder,
): string =>
  toCsv(
    [
      '기간',
      '스냅샷여부',
      '라이브 시작',
      '라이브 종료',
      '일자',
      '필드',
      '필드키',
      '스냅샷',
      '라이브',
      '차이',
      '상세조회',
    ],
    diff.diffs.map((item) => [
      diff.period,
      diff.snapshotExists ? 'Y' : 'N',
      diff.liveFrom ?? '',
      diff.liveTo ?? '',
      item.date,
      item.label,
      item.field,
      formatNullable(item.snapshotValue),
      formatNullable(item.liveValue),
      formatNullable(item.delta),
      drillDownPathFor?.(item) ?? '',
    ]),
  )

export const buildReservationStatsDrillDownCsv = (drillDown: ReservationStatsDrillDown): string =>
  toCsv(
    [
      '기간',
      '일자',
      '필드',
      '필드키',
      '스냅샷여부',
      '스냅샷',
      '라이브',
      '차이',
      'source',
      'GB',
      'GB2',
      'PK',
      '차트번호',
      '예약번호',
      '예약상태',
      '제외후보',
      '기여도',
    ],
    drillDown.rows.map((row) => [
      drillDown.period,
      drillDown.date,
      drillDown.label,
      drillDown.field,
      drillDown.snapshotExists ? 'Y' : 'N',
      formatNullable(drillDown.snapshotValue),
      formatNullable(drillDown.liveValue),
      formatNullable(drillDown.delta),
      row.source,
      row.gb,
      row.gb2,
      row.primaryKey ?? '',
      row.custNum ?? '',
      row.reserveNum ?? '',
      row.reserveState ?? '',
      row.exclusionReasonCandidate ?? '',
      row.contribution,
    ]),
  )

export const buildReservationStatsParityCsv = (parity: ReservationStatsParity): string =>
  toCsv(
    ['기간', '라이브 시작', '라이브 종료', '일자', '필드', '필드키', 'daily', 'drill-down', '차이', 'row수'],
    parity.items.map((item) => [
      parity.period,
      parity.liveFrom,
      parity.liveTo,
      item.date,
      item.label,
      item.field,
      item.dailyValue,
      item.drillDownValue,
      item.delta,
      item.rowCount,
    ]),
  )
