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
 *
 * 주 뷰:
 *   - week    : 해당 월의 주(1주~5주). 라벨 '1주'.
 *   - yearWeek: ISO 8601 연간 주차(1~53). 라벨 'N주차'.
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
  // 월 주(주별) 버킷.
  const monthWeekBuckets = new Map<number, TCounts[]>()
  // ISO 주차(주차) 버킷 — 정렬은 (year, week) 순서 유지용 order 사용.
  const isoWeekBuckets = new Map<string, { counts: TCounts[]; label: string; order: number }>()
  const allCounts: TCounts[] = []
  let isoOrder = 0

  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${period}-${String(day).padStart(2, '0')}`
    const counts = byDate.get(dateStr) ?? deps.zeroCounts()
    const weekdayIdx = new Date(year, month - 1, day).getDay()
    allCounts.push(counts)

    const monthWeek = weekOf(day, firstWeekday)
    monthWeekBuckets.set(monthWeek, [...(monthWeekBuckets.get(monthWeek) ?? []), counts])

    const iso = isoWeek(new Date(year, month - 1, day))
    const isoKey = `${iso.year}-${iso.week}`
    if (!isoWeekBuckets.has(isoKey)) {
      isoWeekBuckets.set(isoKey, { counts: [], label: `${iso.week}주차`, order: isoOrder++ })
    }
    isoWeekBuckets.get(isoKey)!.counts.push(counts)

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

  const monthWeekRows = [...monthWeekBuckets.keys()]
    .sort((a, b) => a - b)
    .map((week) => deps.buildRow(deps.sumCounts(monthWeekBuckets.get(week) ?? []), `${week + 1}주`, 'week'))

  if (granularity === 'week') return [totalRow, ...monthWeekRows]

  if (granularity === 'yearWeek') {
    const rows = [...isoWeekBuckets.values()]
      .sort((a, b) => a.order - b.order)
      .map(({ counts, label }) => deps.buildRow(deps.sumCounts(counts), label, 'week'))
    return [totalRow, ...rows]
  }

  if (granularity === 'all') return [totalRow, ...monthWeekRows, ...dayRows]
  return [totalRow, ...dayRows]
}

/**
 * 임의 날짜 범위(from~to) 를 표시 행으로 변환. 여러 달을 걸쳐도 동작한다.
 * 단일 월 범위면 buildDisplayRowsFromCounts 와 동일한 결과.
 *
 * 주 뷰:
 *   - week    : 해당 월의 주(1~5주). 범위가 여러 달을 걸치면 '3월 1주' 처럼 월 접두.
 *   - yearWeek: ISO 8601 연간 주차(1~53). 여러 해 걸치면 '2026-1주차' 처럼 연도 접두.
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
  // 월 주(주별) 버킷 — 키 'YYYY-M-W'. label 은 단일 월이면 'N주', 여러 달이면 'M월 N주'.
  const monthWeekBuckets = new Map<string, { counts: TCounts[]; label: string; order: number }>()
  // ISO 주차(주차) 버킷 — 키 'YYYY-W'. label 은 단일 해면 'N주', 여러 해면 'YYYY-N주'.
  const isoWeekBuckets = new Map<string, { counts: TCounts[]; label: string; order: number }>()
  const allCounts: TCounts[] = []

  const start = new Date(`${fromDate}T00:00:00`)
  const end = new Date(`${toDate}T00:00:00`)
  const cur = new Date(start)
  const startIso = isoWeek(start)
  const endIso = isoWeek(end)
  const multiYear = startIso.year !== endIso.year
  let monthWeekOrder = 0
  let isoOrder = 0
  // 월별 첫날 요일 캐시 — weekOf 계산에 반복 사용.
  const monthFirstWeekday = new Map<string, number>()
  const firstWeekdayOf = (y: number, mo: number): number => {
    const key = `${y}-${mo}`
    let value = monthFirstWeekday.get(key)
    if (value === undefined) {
      value = new Date(y, mo - 1, 1).getDay()
      monthFirstWeekday.set(key, value)
    }
    return value
  }

  while (cur.getTime() <= end.getTime()) {
    const y = cur.getFullYear()
    const mo = cur.getMonth() + 1
    const d = cur.getDate()
    const dateStr = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const counts = byDate.get(dateStr) ?? deps.zeroCounts()
    const weekdayIdx = cur.getDay()
    allCounts.push(counts)

    // 월 주(week) 버킷: 각 날짜가 속한 월의 첫날 요일 기준으로 계산 → 6월 데이터는 6월 달력 주, 7월 데이터는 7월 달력 주.
    const mWeek = weekOf(d, firstWeekdayOf(y, mo))
    const mKey = `${y}-${mo}-${mWeek}`
    const mLabel = singleMonth ? `${mWeek + 1}주` : `${mo}월 ${mWeek + 1}주`
    if (!monthWeekBuckets.has(mKey)) {
      monthWeekBuckets.set(mKey, { counts: [], label: mLabel, order: monthWeekOrder++ })
    }
    monthWeekBuckets.get(mKey)!.counts.push(counts)

    // ISO 주차 버킷. 라벨은 단일 연도면 'N주차', 여러 해 걸치면 'YYYY-N주차'.
    const iso = isoWeek(cur)
    const isoKey = `${iso.year}-${iso.week}`
    const isoLabel = multiYear ? `${iso.year}-${iso.week}주차` : `${iso.week}주차`
    if (!isoWeekBuckets.has(isoKey)) {
      isoWeekBuckets.set(isoKey, { counts: [], label: isoLabel, order: isoOrder++ })
    }
    isoWeekBuckets.get(isoKey)!.counts.push(counts)

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

  const monthWeekRows = [...monthWeekBuckets.values()]
    .sort((a, b) => a.order - b.order)
    .map(({ counts, label }) => deps.buildRow(deps.sumCounts(counts), label, 'week'))

  if (granularity === 'week') return [totalRow, ...monthWeekRows]

  if (granularity === 'yearWeek') {
    const rows = [...isoWeekBuckets.values()]
      .sort((a, b) => a.order - b.order)
      .map(({ counts, label }) => deps.buildRow(deps.sumCounts(counts), label, 'week'))
    return [totalRow, ...rows]
  }

  if (granularity === 'all') return [totalRow, ...monthWeekRows, ...dayRows]
  return [totalRow, ...dayRows]
}
