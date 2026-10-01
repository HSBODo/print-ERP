import { CalendarRange, Download, MonitorCog, Settings2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useFilter } from '#shared/hooks/useFilter'
import { usePagination } from '#shared/hooks/usePagination'
import { Button } from '#shared/ui/Button'
import { Filter } from '#shared/ui/Filter'
import { TablePagination } from '#shared/ui/TablePagination'
import { downloadCsv, toCsv } from '#shared/utils/csv'
import { thisMonthRange, toIsoDate } from '#shared/utils/date'

import { useEoeisCheckup } from '../../hooks/useEoeisCheckup'
import type { EoeisCheckupRow } from '../../type/api'
import type { SortState } from '../../utils/examListUtils'

type ViewMode = 'count' | 'score'
type PivotTab = 'device' | 'date'
type Granularity = 'month' | 'day' | 'week'

const MIN_QUERY_DATE = '2026-07-01'
const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: 'month', label: '월별' },
  { value: 'day', label: '일별' },
  { value: 'week', label: '주차별' },
]
const MODE_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: 'count', label: '건수' },
  { value: 'score', label: '점수' },
]

interface PivotRow {
  name: string
  kind: 'group' | 'staff'
  cells: number[]
  total: number
}

interface DateGroup {
  label: string
  dayIndexes: number[]
}

const numberFormatter = new Intl.NumberFormat('ko-KR')

const formatNumber = (value: number) => numberFormatter.format(value)

const enumerateDates = (from: string, to: string): string[] => {
  const dates: string[] = []
  const cursor = new Date(`${from}T00:00:00`)
  const end = new Date(`${to}T00:00:00`)
  while (cursor <= end) {
    dates.push(toIsoDate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

const buildDateGroups = (
  granularity: Granularity,
  allDates: string[],
): DateGroup[] => {
  const dates = allDates.map((date, dayIndex) => ({ date, dayIndex }))
  if (granularity === 'day')
    return dates.map(({ date, dayIndex }) => ({
      label: date,
      dayIndexes: [dayIndex],
    }))

  const groups = new Map<string, { dates: string[]; dayIndexes: number[] }>()
  dates.forEach(({ date, dayIndex }) => {
    let key = date.slice(0, 7)
    if (granularity === 'week') {
      const current = new Date(`${date}T00:00:00`)
      current.setDate(current.getDate() - ((current.getDay() + 6) % 7))
      key = toIsoDate(current)
    }
    const group = groups.get(key) ?? { dates: [], dayIndexes: [] }
    group.dates.push(date)
    group.dayIndexes.push(dayIndex)
    groups.set(key, group)
  })

  return [...groups.entries()].map(([key, group]) => ({
    label:
      granularity === 'month'
        ? `${key.slice(0, 4)}년 ${Number(key.slice(5))}월`
        : `${group.dates[0].slice(5).replace('-', '.')} ~ ${group.dates.at(-1)?.slice(5).replace('-', '.')}`,
    dayIndexes: group.dayIndexes,
  }))
}

const DeviceScorePanel = ({
  devices,
  draftScores,
  onScoreChange,
  onApply,
}: {
  devices: string[]
  draftScores: Record<string, number>
  onScoreChange: (device: string, score: number) => void
  onApply: () => void
}) => (
  <div className="rounded-md border border-teal-200/80 bg-teal-50/60 px-3 py-2 shadow-sm">
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <Button
        type="button"
        size="sm"
        className="bg-teal-600 text-white hover:bg-teal-700"
        onClick={onApply}
      >
        적용
      </Button>
      <span className="text-[11px] text-teal-900/70">
        장비별 가중치를 변경하면 점수 보기에서 검사 건수 × 점수로 환산합니다.
        현재는 화면에만 반영됩니다.
      </span>
    </div>
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {devices.map((device) => (
        <label
          key={device}
          className="flex min-w-[9.5rem] items-center justify-between gap-2 text-[11px] text-gray-600"
        >
          <span className="truncate">{device}</span>
          <input
            aria-label={`${device} 점수`}
            type="number"
            min="0"
            value={draftScores[device] ?? 1}
            onChange={(event) =>
              onScoreChange(
                device,
                Math.max(0, Number(event.target.value) || 0),
              )
            }
            className="h-8 w-16 rounded-md border border-border/80 bg-white px-2 text-right text-xs tabular-nums outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </label>
      ))}
    </div>
  </div>
)

const buildPivotRows = (
  records: EoeisCheckupRow[],
  operators: string[],
  devices: string[],
  allDates: string[],
  tab: PivotTab,
  mode: ViewMode,
  scores: Record<string, number>,
  dateGroups: DateGroup[],
): PivotRow[] => {
  const counts = new Map<string, number>()
  records.forEach((row) => {
    const key = `${row.operatorName}\u0000${row.deviceName}\u0000${row.date}`
    counts.set(key, (counts.get(key) ?? 0) + row.count)
  })
  const weightedCount = (
    operator: string,
    device: string,
    dayIndexes: number[],
  ) =>
    dayIndexes.reduce(
      (sum, dayIndex) =>
        sum +
        (counts.get(`${operator}\u0000${device}\u0000${allDates[dayIndex]}`) ??
          0) *
          (mode === 'score' ? (scores[device] ?? 1) : 1),
      0,
    )
  const selectedDays = dateGroups.flatMap((group) => group.dayIndexes)
  return operators.map((operator) => {
    const cells =
      tab === 'device'
        ? devices.map((device) => weightedCount(operator, device, selectedDays))
        : dateGroups.map((group) =>
            devices.reduce(
              (sum, device) =>
                sum + weightedCount(operator, device, group.dayIndexes),
              0,
            ),
          )
    return {
      name: operator,
      kind: operator.startsWith('[') ? 'group' : 'staff',
      cells,
      total: cells.reduce((sum, value) => sum + value, 0),
    }
  })
}

const SortableHeader = ({
  label,
  sortKey,
  sortState,
  onSort,
  className = '',
}: {
  label: string
  sortKey: string
  sortState: SortState
  onSort: (key: string) => void
  className?: string
}) => {
  const direction = sortState?.key === sortKey ? sortState.direction : null
  return (
    <th
      aria-sort={
        direction === 'asc'
          ? 'ascending'
          : direction === 'desc'
            ? 'descending'
            : 'none'
      }
      className={`sticky top-0 z-20 min-w-20 whitespace-nowrap border-b border-border/70 bg-gray-50 px-2 py-2 font-semibold ${className}`}
    >
      <button
        type="button"
        aria-label={`${label} 정렬`}
        onClick={() => onSort(sortKey)}
        className={`inline-flex w-full items-center gap-1 font-semibold transition-colors hover:text-blue-700 ${sortKey === 'name' ? 'justify-start' : 'justify-end'}`}
      >
        <span>{label}</span>
        <span
          className="flex h-3.5 w-2.5 flex-col items-center justify-center gap-px"
          aria-hidden="true"
        >
          <span
            className={`h-0 w-0 border-x-[3.5px] border-b-[4px] border-x-transparent ${direction === 'asc' ? 'border-b-blue-600' : 'border-b-gray-300'}`}
          />
          <span
            className={`h-0 w-0 border-x-[3.5px] border-t-[4px] border-x-transparent ${direction === 'desc' ? 'border-t-blue-600' : 'border-t-gray-300'}`}
          />
        </span>
      </button>
    </th>
  )
}

const StatsTable = ({
  columns,
  rows,
  summaryRows,
  sortState,
  onSort,
  selectedName,
  onSelect,
}: {
  columns: readonly string[]
  rows: PivotRow[]
  summaryRows: PivotRow[]
  sortState: SortState
  onSort: (key: string) => void
  selectedName: string | null
  onSelect: (name: string) => void
}) => {
  const columnTotals = columns.map((_, index) =>
    summaryRows.reduce((sum, row) => sum + row.cells[index], 0),
  )
  const grandTotal = summaryRows.reduce((sum, row) => sum + row.total, 0)

  return (
    <table
      aria-label="아이리더 검사자 통계"
      className="w-max min-w-full border-collapse text-[11px]"
    >
      <thead>
        <tr className="bg-gray-50 text-gray-700">
          <SortableHeader
            label="검사자"
            sortKey="name"
            sortState={sortState}
            onSort={onSort}
            className="left-0 z-30 min-w-28 border-r text-left"
          />
          <SortableHeader
            label="합계"
            sortKey="total"
            sortState={sortState}
            onSort={onSort}
            className="bg-teal-50 font-bold text-teal-900"
          />
          {columns.map((column, index) => (
            <SortableHeader
              key={column}
              label={column}
              sortKey={`column-${index}`}
              sortState={sortState}
              onSort={onSort}
            />
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.name}
            onClick={() => onSelect(row.name)}
            className={`cursor-pointer border-b border-border/45 transition-colors ${selectedName === row.name ? 'bg-amber-100' : 'hover:bg-blue-50/50'}`}
          >
            <td
              className={`sticky left-0 z-10 border-r border-border/50 px-3 py-2 text-left ${selectedName === row.name ? 'bg-amber-100' : 'bg-white'} ${row.kind === 'group' ? 'font-semibold text-teal-900' : 'text-gray-800'}`}
            >
              {row.name}
            </td>
            <td className="bg-teal-50/70 px-3 py-2 text-right font-bold tabular-nums text-teal-950">
              {formatNumber(row.total)}
            </td>
            {row.cells.map((value, index) => (
              <td
                key={`${row.name}-${columns[index]}`}
                className="px-3 py-2 text-right tabular-nums text-gray-700"
              >
                {formatNumber(value)}
              </td>
            ))}
          </tr>
        ))}
        <tr className="bg-gray-50 font-bold text-gray-700">
          <td className="sticky left-0 z-10 border-r border-border/50 bg-gray-50 px-3 py-2 text-left">
            합계
          </td>
          <td className="bg-teal-100 px-3 py-2 text-right tabular-nums text-teal-950">
            {formatNumber(grandTotal)}
          </td>
          {columnTotals.map((value, index) => (
            <td
              key={columns[index]}
              className="px-3 py-2 text-right tabular-nums"
            >
              {formatNumber(value)}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  )
}

export function EoeisCheckupStatsPage() {
  // 조회 기간만 [조회] 때 반영, 조회 단위·보기·탭은 받아온 측정 기록을 다시 묶기만 한다.
  const filter = useFilter({
    defaults: () => ({ range: thisMonthRange() }),
    onSearch: () => {
      pagination.resetPage()
      setStatus('실데이터를 조회하고 있습니다.')
    },
    onReset: () => {
      setMode('count')
      setTab('device')
      setGranularity('day')
      setSortState(null)
      pagination.resetPage()
    },
  })
  const queryPeriod = filter.applied.range
  const [mode, setMode] = useState<ViewMode>('count')
  const [tab, setTab] = useState<PivotTab>('device')
  const [granularity, setGranularity] = useState<Granularity>('day')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [scoreOverrides, setScoreOverrides] = useState<Record<string, number>>(
    {},
  )
  const [draftScores, setDraftScores] = useState<Record<string, number>>({})
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const [status, setStatus] = useState('실데이터를 조회하고 있습니다.')
  const [sortState, setSortState] = useState<SortState>(null)

  const { data, isLoading, isFetching, isError, refetch } = useEoeisCheckup(
    queryPeriod.from,
    queryPeriod.to,
  )
  const records = useMemo(() => data?.rows ?? [], [data])
  const devices = useMemo(
    () =>
      [...new Set(records.map((row) => row.deviceName))].sort((a, b) =>
        a.localeCompare(b, 'ko'),
      ),
    [records],
  )
  const operators = useMemo(
    () =>
      [...new Set(records.map((row) => row.operatorName))].sort((a, b) =>
        a.localeCompare(b, 'ko'),
      ),
    [records],
  )
  const scores = useMemo(
    () =>
      Object.fromEntries(
        devices.map((device) => [
          device,
          scoreOverrides[device] ?? data?.scores[device] ?? 1,
        ]),
      ),
    [data, devices, scoreOverrides],
  )
  const allDates = useMemo(
    () => enumerateDates(queryPeriod.from, queryPeriod.to),
    [queryPeriod],
  )
  const dateGroups = useMemo(
    () => buildDateGroups(granularity, allDates),
    [granularity, allDates],
  )
  const columns =
    tab === 'device' ? devices : dateGroups.map((group) => group.label)
  const rows = useMemo(
    () =>
      buildPivotRows(
        records,
        operators,
        devices,
        allDates,
        tab,
        mode,
        scores,
        dateGroups,
      ),
    [records, operators, devices, allDates, tab, mode, scores, dateGroups],
  )
  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0)
  const sortedRows = useMemo(() => {
    if (!sortState) return rows
    return rows
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const value = (row: PivotRow): string | number => {
          if (sortState.key === 'name') return row.name
          if (sortState.key === 'total') return row.total
          return row.cells[Number(sortState.key.replace('column-', ''))] ?? 0
        }
        const left = value(a.row)
        const right = value(b.row)
        const compared =
          typeof left === 'number' && typeof right === 'number'
            ? left - right
            : String(left).localeCompare(String(right), 'ko-KR', {
                numeric: true,
              })
        return compared === 0
          ? a.index - b.index
          : sortState.direction === 'asc'
            ? compared
            : -compared
      })
      .map(({ row }) => row)
  }, [rows, sortState])
  const pagination = usePagination(sortedRows)

  const handleSort = (key: string) => {
    pagination.resetPage()
    setSortState((current) =>
      current?.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )
  }

  const handleTabChange = (nextTab: PivotTab) => {
    setTab(nextTab)
    setSortState(null)
    pagination.resetPage()
  }

  const handleGranularityChange = (nextGranularity: Granularity) => {
    setGranularity(nextGranularity)
    setSortState(null)
    pagination.resetPage()
  }

  const handleApplyScores = () => {
    setScoreOverrides({ ...draftScores })
    setStatus('장비 점수를 화면에 적용했습니다. 새로고침하면 초기화됩니다.')
  }

  const handleSettingsToggle = () => {
    if (!settingsOpen) setDraftScores({ ...scores })
    setSettingsOpen((open) => !open)
  }

  const handleExport = () => {
    const headers = ['검사자', '합계', ...columns]
    const data = sortedRows.map((row) => [row.name, row.total, ...row.cells])
    downloadCsv(
      `아이리더_검사통계_${queryPeriod.from}_${queryPeriod.to}.csv`,
      toCsv(headers, data),
    )
    setStatus('현재 피벗 화면을 CSV로 내보냈습니다.')
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[36rem] flex-col gap-3 overflow-hidden text-xs text-gray-800">
      <Filter.Root filter={filter} isFetching={isFetching} refetch={refetch}>
        <Filter.Bar>
          <Filter.Select
            value={granularity}
            onChange={handleGranularityChange}
            options={GRANULARITY_OPTIONS}
            ariaLabel="조회 단위"
            className="w-20"
          />
          <Filter.DateRange {...filter.field('range')} min={MIN_QUERY_DATE} />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled
            title="API 연동 후 활성화"
          >
            오늘 수집
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled
            title="API 연동 후 활성화"
          >
            기간 수집
          </Button>
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-semibold ${isError ? 'bg-red-50 text-red-700' : isFetching ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}
          >
            {isError ? '연결 오류' : isFetching ? '조회 중' : '실데이터'}
          </span>
          <span className="text-muted-foreground">보기</span>
          <Filter.Segment
            value={mode}
            onChange={setMode}
            options={MODE_OPTIONS}
            ariaLabel="보기"
          />
          <Filter.Actions>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={handleSettingsToggle}
            >
              <Settings2 />
              장비 점수 설정
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={handleExport}
            >
              <Download />
              CSV 내보내기
            </Button>
          </Filter.Actions>
        </Filter.Bar>
      </Filter.Root>

      {settingsOpen && (
        <DeviceScorePanel
          devices={devices}
          draftScores={draftScores}
          onScoreChange={(device, score) =>
            setDraftScores((current) => ({ ...current, [device]: score }))
          }
          onApply={handleApplyScores}
        />
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center justify-between border-b border-border/70 bg-white px-2 py-1.5">
          <div
            className="flex h-9 items-center gap-1 rounded-lg bg-slate-100 p-1"
            role="radiogroup"
            aria-label="아이리더 통계 구분"
          >
            {(
              [
                ['device', '검사자 × 장비', MonitorCog],
                ['date', '검사자 × 기간', CalendarRange],
              ] as const
            ).map(([key, label, Icon]) => (
              <label
                key={key}
                className={`flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-all ${tab === key ? 'bg-white text-teal-800 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:bg-white/60 hover:text-slate-800'}`}
              >
                <input
                  type="radio"
                  name="eoeis-pivot"
                  value={key}
                  checked={tab === key}
                  onChange={() => handleTabChange(key)}
                  className="sr-only"
                />
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </label>
            ))}
          </div>
          <div className="mb-2 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>{mode === 'count' ? '검사 건수' : '환산 점수'}</span>
            <strong className="text-sm tabular-nums text-gray-900">
              {formatNumber(grandTotal)}
            </strong>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              아이리더 검사통계를 불러오는 중입니다.
            </div>
          ) : isError ? (
            <div className="flex h-full items-center justify-center text-sm text-red-600">
              아이리더 데이터 연결을 확인해주세요.
            </div>
          ) : (
            <StatsTable
              columns={columns}
              rows={pagination.pageRows}
              summaryRows={rows}
              sortState={sortState}
              onSort={handleSort}
              selectedName={selectedName}
              onSelect={(name) =>
                setSelectedName((current) => (current === name ? null : name))
              }
            />
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 border-t border-border/60 bg-white pr-2">
          <TablePagination
            pagination={pagination}
            unit="명"
            className="flex-1"
          />
          <span
            className="hidden text-[11px] text-muted-foreground xl:inline"
            title={status}
          >
            조회 기간 {queryPeriod.from} ~ {queryPeriod.to}
          </span>
        </div>
      </div>
    </div>
  )
}
