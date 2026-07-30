import {
  isoWeek,
  monthShortLabel,
  weekOf,
  weekdayKo,
  type Granularity,
  type RowTier,
} from './reservationStatsCore'
import type { SummaryRow } from './reservationStatsSummary'
import { isSingleMonthRange } from './reservationStatsDateRange'

export interface StatsDisplayRow<TChannel, TSummary = SummaryRow> {
  label: string
  tier: RowTier
  date?: string // 일(day) 행만 채움: yyyy-MM-dd (셀 손보정 대상 식별용)
  weekday?: string
  isTotal?: boolean
  muted?: boolean
  weekStart?: boolean
  channel: TChannel
  summary: TSummary
}

type BuildRow<TCounts, TRow> = (
  counts: TCounts,
  label: string,
  tier: RowTier,
  extra?: Partial<TRow>,
) => TRow

interface BuildDisplayRowsDeps<TCounts, TRow> {
  zeroCounts: () => TCounts
  sumCounts: (rows: readonly TCounts[]) => TCounts
  isZeroCounts: (counts: TCounts) => boolean
  buildRow: BuildRow<TCounts, TRow>
}

/**
 * 일자별 원시 카운트를 조회 단위별 표시 행으로 변환한다.
 * 도메인별 공식은 buildRow 안에 주입하고, 월/주/일 버킷팅만 공유한다.
 */
export function buildDisplayRowsFromCounts<
  TDaily extends { date: string },
  TCounts extends object,
  TRow extends StatsDisplayRow<unknown>,
>(
  granularity: Granularity,
  dailies: readonly TDaily[],
  period: string,
  lastDay: number,
  deps: BuildDisplayRowsDeps<TCounts, TRow>,
): TRow[] {
  const year = Number(period.slice(0, 4))
  const month = Number(period.slice(5, 7))
  const byDate = new Map<string, TCounts>(dailies.map((daily) => [daily.date, daily as unknown as TCounts]))
  const firstWeekday = new Date(year, month - 1, 1).getDay()

  const dayRows: TRow[] = []
  const weekBuckets = new Map<number, TCounts[]>()
  const allCounts: TCounts[] = []

  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${period}-${String(day).padStart(2, '0')}`
    const counts = byDate.get(dateStr) ?? deps.zeroCounts()
    const weekdayIdx = new Date(year, month - 1, day).getDay()
    allCounts.push(counts)

    const week = weekOf(day, firstWeekday)
    weekBuckets.set(week, [...(weekBuckets.get(week) ?? []), counts])
    dayRows.push(
      deps.buildRow(counts, `${day}일`, 'day', {
        date: dateStr,
        weekday: weekdayKo(weekdayIdx),
        muted: deps.isZeroCounts(counts),
        weekStart: day === 1 || weekdayIdx === 0,
      } as Partial<TRow>),
    )
  }

  const totalRow = deps.buildRow(
    deps.sumCounts(allCounts),
    granularity === 'month' ? monthShortLabel(period) : 'TOTAL',
    'month',
  )
  if (granularity === 'month') return [totalRow]

  const weekRows = [...weekBuckets.keys()]
    .sort((a, b) => a - b)
    .map((week) => deps.buildRow(deps.sumCounts(weekBuckets.get(week) ?? []), `${week + 1}주`, 'week'))

  if (granularity === 'week') return [totalRow, ...weekRows]
  if (granularity === 'all') return [totalRow, ...weekRows, ...dayRows]
  return [totalRow, ...dayRows]
}

/**
 * 임의 날짜 범위(from~to) 를 표시 행으로 변환. 여러 달을 걸쳐도 동작한다.
 * 단일 월 범위면 buildDisplayRowsFromCounts 와 동일한 결과(주 라벨은 '1주', 월 라벨은 'X월'),
 * 여러 달 범위면 주 라벨에 월 접두사('3월 1주') 를 붙여 구분.
 *
 * 사용처: 툴바에서 시작일/종료일을 직접 선택한 경우. buildDisplayRowsFromCounts 는
 * 월 단위 조회(년/월 드롭다운) 전용으로 유지 — 골든마스터 테스트 계약을 깨지 않기 위해.
 */
export function buildRangeDisplayRowsFromCounts<
  TDaily extends { date: string },
  TCounts extends object,
  TRow extends StatsDisplayRow<unknown>,
>(
  granularity: Granularity,
  dailies: readonly TDaily[],
  fromDate: string,
  toDate: string,
  deps: BuildDisplayRowsDeps<TCounts, TRow>,
): TRow[] {
  const byDate = new Map<string, TCounts>(dailies.map((d) => [d.date, d as unknown as TCounts]))
  const singleMonth = isSingleMonthRange(fromDate, toDate)

  const dayRows: TRow[] = []
  // 주 버킷: ISO 8601 주차(1~53) 로 그룹. 한 해가 최대 53주까지 나올 수 있어 라벨은 그대로 노출.
  const weekBuckets = new Map<string, { counts: TCounts[]; label: string; order: number }>()
  const allCounts: TCounts[] = []

  const start = new Date(`${fromDate}T00:00:00`)
  const end = new Date(`${toDate}T00:00:00`)
  const cur = new Date(start)
  // 범위 내 여러 해가 걸릴 수 있는지(연말·연초). 걸치면 라벨에 연도 접두사가 필요하다.
  const startIso = isoWeek(start)
  const endIso = isoWeek(end)
  const multiYear = startIso.year !== endIso.year
  let weekOrder = 0
  while (cur.getTime() <= end.getTime()) {
    const y = cur.getFullYear()
    const mo = cur.getMonth() + 1
    const d = cur.getDate()
    const dateStr = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const counts = byDate.get(dateStr) ?? deps.zeroCounts()
    const weekdayIdx = cur.getDay()
    allCounts.push(counts)

    // ISO 주차 기반 버킷. 라벨은 단일 연도면 'N주', 여러 해 걸치면 '2026-1주' 로 연도 접두사.
    const iso = isoWeek(cur)
    const weekKey = `${iso.year}-${iso.week}`
    const label = multiYear ? `${iso.year}-${iso.week}주` : `${iso.week}주`
    if (!weekBuckets.has(weekKey)) {
      weekBuckets.set(weekKey, { counts: [], label, order: weekOrder++ })
    }
    weekBuckets.get(weekKey)!.counts.push(counts)

    // day 라벨: 단일 월이면 'D일'(기존 표기 유지), 여러 달이면 'M/D'.
    const dayLabel = singleMonth ? `${d}일` : `${mo}/${d}`
    dayRows.push(
      deps.buildRow(counts, dayLabel, 'day', {
        date: dateStr,
        weekday: weekdayKo(weekdayIdx),
        muted: deps.isZeroCounts(counts),
        weekStart: weekdayIdx === 1 || cur.getTime() === start.getTime(),
      } as Partial<TRow>),
    )
    cur.setDate(cur.getDate() + 1)
  }

  // TOTAL 라벨: 단일 월이면 'X월', 여러 달이면 'TOTAL'.
  const totalLabel =
    granularity === 'month' && singleMonth
      ? monthShortLabel(fromDate.slice(0, 7))
      : 'TOTAL'
  const totalRow = deps.buildRow(deps.sumCounts(allCounts), totalLabel, 'month')
  if (granularity === 'month') return [totalRow]

  const weekRows = [...weekBuckets.values()]
    .sort((a, b) => a.order - b.order)
    .map(({ counts, label }) => deps.buildRow(deps.sumCounts(counts), label, 'week'))

  if (granularity === 'week') return [totalRow, ...weekRows]
  if (granularity === 'all') return [totalRow, ...weekRows, ...dayRows]
  return [totalRow, ...dayRows]
}
