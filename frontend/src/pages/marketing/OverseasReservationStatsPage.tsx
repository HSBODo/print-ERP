import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ChevronDown } from 'lucide-react'
import {
  useOverseasReservationStats,
  useOverseasReservationStatUpdate,
} from '@/hooks/marketing/useOverseasMarketing'

/** CSV(레거시 구글시트)와 동일한 그룹·채널 구성. 키는 백엔드 group_key/metric_key와 1:1. */
interface StatColumn {
  metric: string
  label: string
}
interface StatGroup {
  key: string
  label: string
  columns: StatColumn[]
  headerClass: string
}

const channelPairs = (pairs: [string, string][]): StatColumn[] =>
  pairs.flatMap(([key, label]) => [
    { metric: `${key}_inq`, label },
    { metric: `${key}_rsv`, label: '예약' },
  ])

const withCommon = (channels: [string, string][]): StatColumn[] => [
  { metric: 'inq', label: '총 문의' },
  { metric: 'rsv', label: '총 예약' },
  ...channelPairs(channels),
  { metric: 'exam', label: '검사' },
  { metric: 'surgery', label: '수술' },
  { metric: 'outpatient', label: '외래' },
]

const GROUPS: StatGroup[] = [
  {
    key: 'total', label: '총', headerClass: 'bg-slate-100 text-slate-800',
    columns: [
      { metric: 'inq', label: '총 문의' },
      { metric: 'rsv', label: '총 예약' },
      { metric: 'exam', label: '총 검사' },
      { metric: 'surgery', label: '총 수술' },
      { metric: 'outpatient', label: '총 외래' },
    ],
  },
  {
    key: 'anglo', label: '영미', headerClass: 'bg-blue-50 text-blue-800',
    columns: withCommon([
      ['homepage', '홈페이지'], ['email', '이메일'], ['kakao', '카카오톡'], ['whatsapp', '왓츠앱'],
      ['meta_dm', 'Meta-DM'], ['phone', '전화'], ['contact_center', '컨택센터'], ['etc', '기타'],
    ]),
  },
  {
    key: 'china', label: '중화', headerClass: 'bg-rose-50 text-rose-800',
    columns: withCommon([
      ['web_mail_phone', '홈/메일/전화'], ['wechat', '위챗'], ['xiaohongshu', '샤오홍슈'], ['line', '라인'],
      ['insta_tiktok', 'Insta/Tiktok'], ['creatrip', 'Creatrip'], ['contact_center', '컨택센터'], ['etc', '기타'],
    ]),
  },
  {
    key: 'vietnam', label: '베트남', headerClass: 'bg-emerald-50 text-emerald-800',
    columns: withCommon([['meta', '메타'], ['phone', '전화'], ['etc', '기타']]),
  },
  {
    key: 'mongolia', label: '몽골', headerClass: 'bg-amber-50 text-amber-800',
    columns: withCommon([['facebook', '페북'], ['insta', '인스타'], ['phone', '전화'], ['etc', '기타']]),
  },
  {
    key: 'agency', label: '에이전시', headerClass: 'bg-violet-50 text-violet-800',
    columns: withCommon([['direct', '문의'], ['creatrip', 'Creatrip']]),
  },
]

/** 예약통계_시력교정과 동일한 5단 구성. 주간 = 그 달의 달력 주(1~5주), 주차 = ISO 연간 주차. */
type ViewMode = 'month' | 'week' | 'yearWeek' | 'day' | 'all'
const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'month', label: '월간' },
  { value: 'week', label: '주간' },
  { value: 'yearWeek', label: '주차' },
  { value: 'day', label: '일간' },
  { value: 'all', label: '전체' },
]
const MONTH_SCOPED: ViewMode[] = ['week', 'day', 'all']

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const pad2 = (n: number) => String(n).padStart(2, '0')
const dayLabel = (iso: string) => {
  const date = new Date(`${iso}T00:00:00`)
  return `${date.getMonth() + 1}/${date.getDate()} (${WEEKDAYS[date.getDay()]})`
}

const daysOfMonth = (year: number, month: number): string[] => {
  const last = new Date(year, month, 0).getDate()
  return Array.from({ length: last }, (_, i) => `${year}-${pad2(month)}-${pad2(i + 1)}`)
}
const daysOfYear = (year: number): string[] =>
  Array.from({ length: 12 }, (_, i) => i + 1).flatMap((m) => daysOfMonth(year, m))

/** ISO 8601 주차 (연간 주차 라벨용). */
const isoWeekOf = (iso: string): number => {
  const date = new Date(`${iso}T00:00:00`)
  const day = (date.getDay() + 6) % 7 // 월=0
  date.setDate(date.getDate() - day + 3)
  const firstThursday = new Date(date.getFullYear(), 0, 4)
  const diff = date.getTime() - firstThursday.getTime()
  return 1 + Math.round((diff / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7)
}

/** 표 행 — dates에 속한 일별 값을 합산해 표시한다. 일 행(tier='day')만 셀 수정 가능. */
interface StatRow {
  key: string
  label: string
  dates: string[]
  tier: 'month' | 'week' | 'day'
}

const buildRows = (view: ViewMode, year: number, month: number): StatRow[] => {
  if (view === 'month') {
    return Array.from({ length: 12 }, (_, i) => ({
      key: `m${i + 1}`, label: `${i + 1}월`, dates: daysOfMonth(year, i + 1), tier: 'month' as const,
    }))
  }
  if (view === 'yearWeek') {
    const byWeek = new Map<number, string[]>()
    for (const iso of daysOfYear(year)) {
      const week = isoWeekOf(iso)
      byWeek.set(week, [...(byWeek.get(week) ?? []), iso])
    }
    return [...byWeek.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([week, dates]) => ({ key: `yw${week}`, label: `${week}주차`, dates, tier: 'week' as const }))
  }
  const days = daysOfMonth(year, month)
  const dayRows: StatRow[] = days.map((iso) => ({ key: iso, label: dayLabel(iso), dates: [iso], tier: 'day' }))
  if (view === 'day') return dayRows
  // 주간: 그 달을 달력 주(월요일 시작) 단위로 잘라 1주~5주로 나눈다.
  const weekRows: StatRow[] = []
  let current: string[] = []
  for (const iso of days) {
    const isMonday = new Date(`${iso}T00:00:00`).getDay() === 1
    if (isMonday && current.length > 0) {
      weekRows.push({ key: `w${weekRows.length + 1}`, label: `${weekRows.length + 1}주`, dates: current, tier: 'week' })
      current = []
    }
    current.push(iso)
  }
  if (current.length > 0) {
    weekRows.push({ key: `w${weekRows.length + 1}`, label: `${weekRows.length + 1}주`, dates: current, tier: 'week' })
  }
  if (view === 'week') return weekRows
  // 전체: 시력교정과 동일하게 주 행 다음에 일 행을 이어 붙인다(합계는 하단 고정 행).
  return [...weekRows, ...dayRows]
}

const SELECT_CLASS =
  'h-8 appearance-none rounded-md border border-border/80 bg-white pl-2.5 pr-8 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

export function OverseasReservationStatsPage() {
  const now = new Date()
  const [year, setYear] = useState(2026)
  const [view, setView] = useState<ViewMode>('month')
  const [month, setMonth] = useState(now.getFullYear() === 2026 ? now.getMonth() + 1 : 8)
  const [editing, setEditing] = useState<{ date: string; cellKey: string; draft: string } | null>(null)

  // 일별 데이터 한 번만 받아 모든 뷰를 클라이언트에서 집계 — 뷰 전환이 즉시 된다.
  const stats = useOverseasReservationStats(year, 'day')
  const updateStat = useOverseasReservationStatUpdate()

  const valueMap = useMemo(() => {
    const map = new Map<string, Record<string, number>>()
    for (const bucket of stats.data?.buckets ?? []) map.set(bucket.bucket, bucket.values)
    return map
  }, [stats.data])

  const rows = useMemo(() => buildRows(view, year, month), [view, year, month])

  const sumOf = (dates: string[], cellKey: string) => {
    let sum = 0
    for (const date of dates) sum += valueMap.get(date)?.[cellKey] ?? 0
    return sum
  }

  // 하단 합계 = 현재 화면 범위(연간 또는 선택 월)의 일별 합 — '전체' 뷰의 주+일 중복 합산을 피한다.
  const scopeDates = useMemo(
    () => (MONTH_SCOPED.includes(view) ? daysOfMonth(year, month) : daysOfYear(year)),
    [view, year, month],
  )

  const editableRow = (row: StatRow) => row.tier === 'day'

  const commitEdit = async () => {
    if (!editing) return
    const { date, cellKey, draft } = editing
    const current = valueMap.get(date)?.[cellKey] ?? 0
    const next = draft.trim() === '' ? 0 : Number(draft.trim())
    setEditing(null)
    if (!Number.isInteger(next) || next < 0 || next > 99999) {
      toast.error('0~99999 사이 숫자만 입력할 수 있습니다.')
      return
    }
    if (next === current) return
    const [groupKey, ...metricParts] = cellKey.split('.')
    try {
      await updateStat.mutateAsync({ date, groupKey, metricKey: metricParts.join('.'), value: next })
      toast.success(`${dayLabel(date)} 값이 저장되었습니다.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '저장에 실패했습니다.')
    }
  }

  const renderCell = (row: StatRow, group: StatGroup, column: StatColumn) => {
    const cellKey = `${group.key}.${column.metric}`
    const value = sumOf(row.dates, cellKey)
    const date = row.dates[0]
    const isEditing = editing?.date === date && editing?.cellKey === cellKey && editableRow(row)
    if (isEditing) {
      return (
        <input
          autoFocus
          value={editing.draft}
          onChange={(event) => setEditing({ ...editing, draft: event.target.value })}
          onBlur={() => void commitEdit()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void commitEdit()
            if (event.key === 'Escape') setEditing(null)
          }}
          className="h-6 w-full min-w-10 rounded border border-blue-400 bg-white px-1 text-center text-xs tabular-nums outline-none ring-2 ring-blue-100"
          inputMode="numeric"
        />
      )
    }
    if (!editableRow(row)) {
      return value !== 0
        ? <span className="tabular-nums">{value.toLocaleString()}</span>
        : <span className="text-gray-300">-</span>
    }
    return (
      <button
        type="button"
        onClick={() => setEditing({ date, cellKey, draft: value !== 0 ? String(value) : '' })}
        className="block h-6 w-full min-w-10 rounded px-1 text-center tabular-nums hover:bg-blue-50"
        title="클릭하여 수정"
      >
        {value !== 0 ? value.toLocaleString() : <span className="text-gray-300">-</span>}
      </button>
    )
  }

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <div className="rounded-lg border border-border/70 bg-white">
        <div className="flex h-11 min-w-max items-center gap-1.5 px-2">
          <div className="relative">
            <select value={year} onChange={(event) => setYear(Number(event.target.value))} className={`${SELECT_CLASS} w-[6.5rem]`} aria-label="연도">
              {[2026, 2027].map((y) => <option key={y} value={y}>{y}년</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          </div>
          <div className="flex h-8 overflow-hidden rounded-md border border-border/80">
            {VIEW_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => { setView(option.value); setEditing(null) }}
                className={`border-l border-border/70 px-3 text-xs first:border-l-0 ${view === option.value ? 'bg-blue-600 font-semibold text-white' : 'hover:bg-gray-50'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {MONTH_SCOPED.includes(view) && (
            <div className="relative">
              <select value={month} onChange={(event) => setMonth(Number(event.target.value))} className={`${SELECT_CLASS} w-[5.5rem]`} aria-label="월">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}월</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
            </div>
          )}
          <span className="ml-2 text-[11px] text-muted-foreground">
            {stats.data ? `${stats.data.cutover}까지 레거시 시트 숫자 · 이후는 접수리스트 자동 집계 · 일 행은 셀 클릭으로 수정` : ''}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-border/70 bg-white">
        {stats.isLoading && <p className="p-6 text-sm text-muted-foreground">불러오는 중…</p>}
        {stats.isError && <p className="p-6 text-sm text-red-500">조회에 실패했습니다. 새로고침 후 다시 시도해 주세요.</p>}
        {stats.data && (
          <table className="min-w-max border-separate border-spacing-0 text-xs">
            <thead className="sticky top-0 z-20">
              <tr>
                <th rowSpan={2} className="sticky left-0 z-30 border-b border-r border-border/70 bg-gray-50 px-3 py-1.5 text-left font-semibold text-gray-700">구분</th>
                {GROUPS.map((group) => (
                  <th key={group.key} colSpan={group.columns.length} className={`border-b border-r border-border/70 px-2 py-1 text-center font-bold ${group.headerClass}`}>
                    {group.label}
                  </th>
                ))}
              </tr>
              <tr>
                {GROUPS.flatMap((group) =>
                  group.columns.map((column, index) => (
                    <th
                      key={`${group.key}.${column.metric}`}
                      className={`whitespace-nowrap border-b border-border/70 px-1.5 py-1 text-center font-medium ${group.headerClass} ${index === group.columns.length - 1 ? 'border-r' : 'border-r border-border/30'}`}
                    >
                      {column.label}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className={`hover:bg-gray-50/60 ${row.tier === 'week' && view === 'all' ? 'bg-gray-50/70 font-medium' : ''}`}>
                  <td className="sticky left-0 z-10 whitespace-nowrap border-b border-r border-border/60 bg-white px-3 py-0.5 font-medium text-gray-800">
                    {row.label}
                  </td>
                  {GROUPS.flatMap((group) =>
                    group.columns.map((column, index) => (
                      <td
                        key={`${group.key}.${column.metric}`}
                        className={`border-b border-border/40 px-0.5 py-0.5 text-center ${index === group.columns.length - 1 ? 'border-r border-r-border/70' : 'border-r border-r-border/20'}`}
                      >
                        {renderCell(row, group, column)}
                      </td>
                    )),
                  )}
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td className="sticky left-0 z-10 border-r border-t border-border/70 bg-gray-50 px-3 py-1 text-gray-900">합계</td>
                {GROUPS.flatMap((group) =>
                  group.columns.map((column, index) => {
                    const sum = sumOf(scopeDates, `${group.key}.${column.metric}`)
                    return (
                      <td
                        key={`${group.key}.${column.metric}`}
                        className={`border-t border-border/70 px-1 py-1 text-center tabular-nums ${index === group.columns.length - 1 ? 'border-r border-r-border/70' : 'border-r border-r-border/20'}`}
                      >
                        {sum !== 0 ? sum.toLocaleString() : <span className="text-gray-300">-</span>}
                      </td>
                    )
                  }),
                )}
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
