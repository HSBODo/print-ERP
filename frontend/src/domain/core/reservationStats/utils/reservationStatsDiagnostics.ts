import { toCsv } from '#shared/utils/csv'

import type {
  ReservationStatsDiffItem,
  ReservationStatsDiff,
  ReservationStatsDrillDown,
  ReservationStatsParity,
} from '../type/api'

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

export const buildReservationStatsDrillDownCsv = (
  drillDown: ReservationStatsDrillDown,
): string =>
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

export const buildReservationStatsParityCsv = (
  parity: ReservationStatsParity,
): string =>
  toCsv(
    [
      '기간',
      '라이브 시작',
      '라이브 종료',
      '일자',
      '필드',
      '필드키',
      'daily',
      'drill-down',
      '차이',
      'row수',
    ],
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
