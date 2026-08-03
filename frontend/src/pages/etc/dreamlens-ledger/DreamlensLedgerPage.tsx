import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Download, Loader2, Plus, RotateCcw, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { columnsToCsv, downloadCsv } from '@/utils/csv'
import {
  dreamlensLedgerApi,
  type DreamlensLedgerRequest,
  type DreamlensLedgerRow,
} from '@/api/etc'
import { LedgerCell } from './LedgerCell'
import {
  EXAMINERS,
  LEDGER_COLUMNS,
  LEDGER_GROUPS,
  REVENUE_KEYS,
  emptyRow,
  suggestionListId,
  type LedgerFieldKey,
} from './ledgerColumns'
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  buildPaginationItems,
  compareSortValue,
  csvColumnsOf,
  defaultFrom,
  defaultTo,
  formatCount,
  getSortValue,
  isoWeekNumbers,
  isoWeekOf,
  ledgerYears,
  matchesKeyword,
  today,
  weekValueOf,
  toMonthEnd,
  toMonthStart,
  toMonthValue,
  toWeekEnd,
  toWeekStart,
  toWeekValue,
  type PeriodMode,
  type SortState,
} from './ledgerUtils'

/** 저장 요청 본문 — 서버 계산값(totalRevenue)과 id 는 제외. */
const toRequest = (row: DreamlensLedgerRow): DreamlensLedgerRequest => {
  const draft = {} as Record<string, unknown>
  for (const column of LEDGER_COLUMNS) draft[column.key] = row[column.key]
  return draft as DreamlensLedgerRequest
}

const won = (value: number) => (value === 0 ? '' : value.toLocaleString('ko-KR'))

/** 체크박스/합계 열 폭 — "합계"가 한 줄에 들어가야 세로로 쪼개지지 않는다. */
const SELECT_COL_WIDTH = 52

export function DreamlensLedgerPage() {
  // 조회 구간만 서버 파라미터다 — draft(입력중) / query(조회에 반영됨)를 나눈다.
  const [draftPeriodMode, setDraftPeriodMode] = useState<PeriodMode>('daily')
  const [draftFrom, setDraftFrom] = useState(defaultFrom)
  const [draftTo, setDraftTo] = useState(defaultTo)
  const [queryFrom, setQueryFrom] = useState(defaultFrom)
  const [queryTo, setQueryTo] = useState(defaultTo)
  // 검사자·검색은 받아온 행을 거르는 클라이언트 필터라 즉시 반영한다(서버 왕복 불필요).
  const [examiner, setExaminer] = useState('전체')
  const [keyword, setKeyword] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [sortState, setSortState] = useState<SortState>(null)

  const queryClient = useQueryClient()
  const queryKey = useMemo(() => ['dreamlens-ledger', queryFrom, queryTo], [queryFrom, queryTo])

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey,
    queryFn: () => dreamlensLedgerApi.list(queryFrom, queryTo),
    enabled: Boolean(queryFrom && queryTo) && queryFrom <= queryTo,
  })

  const rows = useMemo(() => data ?? [], [data])
  const filtered = useMemo(
    () =>
      rows
        .filter(
          (row) =>
            (examiner === '전체' || (row.examiner ?? '') === examiner) && matchesKeyword(row, keyword),
        )
        // 최신 날짜가 맨 위. 서버도 같은 순서로 주지만, 행을 추가하거나 날짜를 고친 뒤에도
        // 재조회 없이 자리를 잡게 화면에서 한 번 더 정렬한다(같은 날짜면 나중 입력이 위).
        .sort((a, b) => (a.entryDate === b.entryDate ? b.id - a.id : b.entryDate < a.entryDate ? -1 : 1)),
    [rows, examiner, keyword],
  )

  /** 헤더를 눌러 고른 정렬. 고르지 않았으면 기본 순서(최신 날짜 위)를 그대로 쓴다. */
  const sorted = useMemo(() => {
    if (!sortState) return filtered
    const { key, direction } = sortState
    return filtered
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const compared = compareSortValue(getSortValue(a.row, key), getSortValue(b.row, key))
        if (compared !== 0) return direction === 'asc' ? compared : -compared
        return a.index - b.index // 동점이면 기존 순서 유지(정렬이 튀지 않게)
      })
      .map(({ row }) => row)
  }, [filtered, sortState])

  // 필터로 페이지 수가 줄어도 상태 변경 없이 렌더 시점에 범위로 보정한다.
  const pageMax = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(currentPage, pageMax)
  const paginationItems = useMemo(() => buildPaginationItems(safePage, pageMax), [safePage, pageMax])
  const visibleRows = useMemo(
    () => sorted.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sorted, safePage, pageSize],
  )
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1
  const rangeEnd = Math.min(safePage * pageSize, filtered.length)

  const handlePageChange = (page: number) => setCurrentPage(Math.min(Math.max(page, 1), pageMax))

  /** 클라이언트 필터 변경 — 즉시 반영하고 1페이지로(3페이지에서 걸러 0건이 보이는 걸 막는다). */
  const changeFilter = (apply: () => void) => {
    apply()
    setCurrentPage(1)
  }

  const setRows = (updater: (old: DreamlensLedgerRow[]) => DreamlensLedgerRow[]) =>
    queryClient.setQueryData<DreamlensLedgerRow[]>(queryKey, (old) => updater(old ?? []))

  const updateMutation = useMutation({
    mutationFn: ({ id, row }: { id: number; row: DreamlensLedgerRow }) =>
      dreamlensLedgerApi.update(id, toRequest(row)),
    onSuccess: (saved) => setRows((old) => old.map((row) => (row.id === saved.id ? saved : row))),
    onError: () => toast.error('저장하지 못했습니다. 잠시 후 다시 시도해주세요.'),
  })

  const createMutation = useMutation({
    mutationFn: () => {
      // 새 행이 조회 구간 밖으로 나가 사라지지 않게 오늘이 구간 안일 때만 오늘로 둔다.
      const now = today()
      const date = now >= queryFrom && now <= queryTo ? now : queryTo
      return dreamlensLedgerApi.create(emptyRow(date) as unknown as DreamlensLedgerRequest)
    },
    onSuccess: (saved) => {
      setRows((old) => [saved, ...old])
      setCurrentPage(1) // 새 행은 맨 위 = 1페이지. 다른 페이지에 있었으면 따라간다.
      toast.success('행을 추가했습니다. 맨 위에 있습니다.')
    },
    onError: () => toast.error('행을 추가하지 못했습니다.'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.allSettled(ids.map((id) => dreamlensLedgerApi.remove(id)))
      const removed = ids.filter((_id, index) => results[index].status === 'fulfilled')
      const failed = ids.length - removed.length
      return { removed, failed }
    },
    onSuccess: ({ removed, failed }) => {
      const gone = new Set(removed)
      setRows((old) => old.filter((row) => !gone.has(row.id)))
      setSelected(new Set())
      if (failed > 0) toast.error(`${formatCount(failed)}건을 삭제하지 못했습니다.`)
      else toast.success(`${formatCount(removed.length)}건을 삭제했습니다.`)
    },
    onError: () => toast.error('삭제하지 못했습니다.'),
  })

  const busyRowId = updateMutation.isPending ? updateMutation.variables?.id : undefined
  const busy = isLoading || isFetching

  const commitCell = (row: DreamlensLedgerRow, key: LedgerFieldKey, next: string | number | null) => {
    updateMutation.mutate({ id: row.id, row: { ...row, [key]: next } as DreamlensLedgerRow })
  }

  const totals = useMemo(() => {
    const sums = {} as Record<string, number>
    for (const key of REVENUE_KEYS) {
      sums[key] = filtered.reduce((total, row) => total + Number(row[key] ?? 0), 0)
    }
    sums.totalRevenue = filtered.reduce((total, row) => total + row.totalRevenue, 0)
    return sums
  }, [filtered])

  /** 조회 = 구간 재조회(서버). 나머지 필터는 이미 즉시 반영돼 있다. */
  const handleSearch = () => {
    setSelected(new Set())
    setCurrentPage(1)
    setQueryFrom(draftFrom)
    setQueryTo(draftTo)
  }

  /** 주차 드롭다운의 현재 선택값 — draft 시작일이 속한 ISO 주차. */
  const weekPick = useMemo(() => isoWeekOf(draftFrom), [draftFrom])

  /** 연도·주차 선택 → 그 주(월~일)로 구간을 맞춘다. 53주가 없는 해를 고르면 마지막 주로 보정. */
  const applyWeek = (year: number, week: number) => {
    const value = weekValueOf(year, Math.min(week, isoWeekNumbers(year).length))
    setDraftFrom(toWeekStart(value))
    setDraftTo(toWeekEnd(value))
  }

  /** 주차·월별로 바꾸면 시작일이 속한 주/달의 경계로 from·to 를 맞춘다(일별은 사용자가 직접 고른다). */
  const handlePeriodModeChange = (mode: PeriodMode) => {
    setDraftPeriodMode(mode)
    if (mode === 'weekly') {
      const week = toWeekValue(draftFrom)
      setDraftFrom(toWeekStart(week))
      setDraftTo(toWeekEnd(week))
    } else if (mode === 'monthly') {
      const month = toMonthValue(draftFrom)
      setDraftFrom(toMonthStart(month))
      setDraftTo(toMonthEnd(month))
    }
  }

  const handleReset = () => {
    setDraftPeriodMode('daily')
    setDraftFrom(defaultFrom())
    setDraftTo(defaultTo())
    setQueryFrom(defaultFrom())
    setQueryTo(defaultTo())
    setExaminer('전체')
    setKeyword('')
    setSelected(new Set())
    setPageSize(DEFAULT_PAGE_SIZE)
    setCurrentPage(1)
    setSortState(null)
  }

  const handleDelete = () => {
    const ids = [...selected]
    if (ids.length === 0) return
    if (!window.confirm(`선택한 ${formatCount(ids.length)}건을 삭제할까요? 되돌릴 수 없습니다.`)) return
    deleteMutation.mutate(ids)
  }

  /** 현재 조회·필터·정렬 결과 전체를 CSV로 — 표에 보이는 칼럼/값/순서 그대로(페이지 무관). */
  const handleDownloadCsv = () => {
    downloadCsv(`드림렌즈장부_${queryFrom}_${queryTo}.csv`, columnsToCsv(csvColumnsOf(), sorted))
  }

  /** 같은 컬럼을 다시 누르면 오름↔내림 토글, 다른 컬럼이면 오름차순부터. */
  const handleSort = (key: LedgerFieldKey) => {
    setCurrentPage(1)
    setSortState((prev) =>
      prev?.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )
  }

  // 헤더 체크박스는 "보이는 페이지" 기준 — 안 보이는 페이지까지 한 번에 지우는 사고를 막는다.
  const allChecked = visibleRows.length > 0 && visibleRows.every((row) => selected.has(row.id))
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const row of visibleRows) {
        if (allChecked) next.delete(row.id)
        else next.add(row.id)
      }
      return next
    })
  }
  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[32rem] flex-col gap-3 overflow-hidden text-xs text-gray-800">
      {/* 툴바 — 예약자 리스트 화면과 동일한 단일 행 구성 */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border/70 bg-white px-1.5 py-1 text-xs shadow-sm">
        <div className="flex flex-wrap items-center gap-1 text-xs text-gray-700">
          <div className="relative">
            <select
              aria-label="기간 단위"
              value={draftPeriodMode}
              onChange={(e) => handlePeriodModeChange(e.target.value as PeriodMode)}
              className="h-8 w-20 appearance-none rounded-md border border-border/80 bg-white pl-2.5 pr-8 text-xs outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            >
              <option value="daily">일별</option>
              <option value="weekly">주차</option>
              <option value="monthly">월별</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          </div>
          {draftPeriodMode === 'weekly' ? (
            <>
              {/* 브라우저 기본 주차 선택기(<input type="week">)는 일요일 시작 달력이라
                  ISO 주차(월~일)와 어긋나 보인다. 연도·주차 드롭다운으로 직접 고르게 한다. */}
              <div className="relative">
                <select
                  aria-label="조회 연도"
                  value={weekPick.year}
                  onChange={(e) => applyWeek(Number(e.target.value), weekPick.week)}
                  className="h-8 w-[5.5rem] appearance-none rounded-md border border-border/80 bg-white pl-2.5 pr-7 text-xs outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  {ledgerYears().map((year) => (
                    <option key={year} value={year}>{year}년</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
              </div>
              <div className="relative">
                <select
                  aria-label="조회 주차"
                  value={weekPick.week}
                  onChange={(e) => applyWeek(weekPick.year, Number(e.target.value))}
                  className="h-8 w-[5.5rem] appearance-none rounded-md border border-border/80 bg-white pl-2.5 pr-7 text-xs outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  {isoWeekNumbers(weekPick.year).map((week) => (
                    <option key={week} value={week}>{week}주차</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
              </div>
              {/* 주차만 보면 실제 날짜를 알 수 없어 구간을 함께 적는다(ISO 주차 = 월~일). */}
              <span className="whitespace-nowrap text-gray-500 tabular-nums">
                {draftFrom} ~ {draftTo}
              </span>
            </>
          ) : draftPeriodMode === 'monthly' ? (
            <input
              aria-label="조회 월"
              type="month"
              value={toMonthValue(draftFrom)}
              max={toMonthValue(defaultTo())}
              onChange={(e) => {
                if (!e.target.value) return
                setDraftFrom(toMonthStart(e.target.value))
                setDraftTo(toMonthEnd(e.target.value))
              }}
              className="h-8 w-[8.2rem] rounded-md border border-border/80 bg-white px-2 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          ) : (
            <>
              <input
                aria-label="조회 시작일"
                type="date"
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
                className="h-8 w-[8.2rem] rounded-md border border-border/80 bg-white px-2 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <span className="text-gray-400">~</span>
              <input
                aria-label="조회 종료일"
                type="date"
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
                className="h-8 w-[8.2rem] rounded-md border border-border/80 bg-white px-2 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </>
          )}
        </div>
        <div className="h-6 w-px bg-border" />
        <div className="relative">
          <select
            aria-label="검사자"
            value={examiner}
            onChange={(e) => changeFilter(() => setExaminer(e.target.value))}
            className="h-8 w-32 appearance-none rounded-md border border-border/80 bg-white pl-2.5 pr-8 text-xs outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            <option value="전체">검사자 전체</option>
            {EXAMINERS.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
        </div>
        <div className="flex h-8 overflow-hidden rounded-md border border-border/80 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
          <input
            type="text"
            value={keyword}
            onChange={(e) => changeFilter(() => setKeyword(e.target.value))}
            placeholder="이름 · 고객번호 · 검사자"
            className="h-full w-[13rem] border-0 bg-white px-3 text-xs outline-none placeholder:text-gray-400"
          />
        </div>
        <div className="flex h-8 items-center gap-2 rounded-md border border-border/80 bg-white px-3 text-xs" aria-live="polite">
          <span className="text-muted-foreground">조회건수</span>
          <strong className="tabular-nums text-gray-900">{formatCount(filtered.length)}건</strong>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Button type="button" variant="outline" size="sm" className="text-xs" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            초기화
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={busy}
            className="bg-blue-600 text-xs text-white hover:bg-blue-700"
            onClick={handleSearch}
          >
            <Search className="h-3.5 w-3.5" />
            조회
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={filtered.length === 0}
            className="bg-emerald-600 text-xs text-white hover:bg-emerald-700"
            onClick={handleDownloadCsv}
            title="조회 결과 전체를 CSV로 내려받기"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={createMutation.isPending}
            className="text-xs"
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            추가
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={selected.size === 0 || deleteMutation.isPending}
            className="bg-rose-600 text-xs text-white hover:bg-rose-700 disabled:bg-rose-600/40"
            onClick={handleDelete}
            title="선택한 행 삭제"
          >
            {deleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            삭제{selected.size > 0 ? ` (${selected.size})` : ''}
          </Button>
        </div>
      </div>

      <Card className="min-h-0 flex-1 border-border/70 py-0 shadow-sm">
        <CardContent className="flex h-full min-h-0 flex-col px-0">
          {isError ? (
            <div className="flex flex-1 items-center justify-center px-3 text-sm text-red-500">
              장부를 불러오지 못했습니다. 조회 기간과 API 설정을 확인해주세요.
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto rounded-t-lg border-b border-border/60">
              <table className="border-collapse text-[11px]">
                <thead>
                  <tr>
                    <th
                      rowSpan={2}
                      style={{ width: SELECT_COL_WIDTH, minWidth: SELECT_COL_WIDTH }}
                      className="sticky top-0 z-20 whitespace-nowrap border border-border/60 bg-slate-100 px-2 py-1.5"
                    >
                      <input
                        type="checkbox"
                        aria-label="현재 페이지 전체 선택"
                        checked={allChecked}
                        onChange={toggleAll}
                        className="h-3.5 w-3.5 align-middle accent-rose-600"
                      />
                    </th>
                    {LEDGER_GROUPS.map((group) => (
                      <th
                        key={group.id}
                        colSpan={group.columns.length}
                        className={`sticky top-0 z-10 border border-border/60 px-2 py-1.5 font-semibold ${group.headClass}`}
                      >
                        {group.label}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {LEDGER_GROUPS.flatMap((group) =>
                      group.columns.map((column) => {
                        const direction = sortState?.key === column.key ? sortState.direction : null

                        return (
                          <th
                            key={column.key}
                            aria-sort={
                              direction === 'asc' ? 'ascending'
                                : direction === 'desc' ? 'descending'
                                  : 'none'
                            }
                            style={{ width: column.width, minWidth: column.width }}
                            className={`sticky top-[31px] z-10 whitespace-nowrap border border-border/60 px-1.5 py-1.5 text-center font-medium ${group.headClass}`}
                          >
                            <button
                              type="button"
                              onClick={() => handleSort(column.key)}
                              title={`${column.label} 기준 정렬`}
                              className="inline-flex w-full items-center justify-center gap-1 text-[11px] font-medium text-gray-800 transition-colors hover:text-blue-700 focus-visible:outline-none"
                            >
                              <span>{column.label}</span>
                              <span className="flex h-3.5 w-2.5 shrink-0 flex-col items-center justify-center gap-[1px]" aria-hidden="true">
                                <span
                                  className={`h-0 w-0 border-x-[3.5px] border-b-[4px] border-x-transparent ${
                                    direction === 'asc' ? 'border-b-blue-600' : 'border-b-gray-300'
                                  }`}
                                />
                                <span
                                  className={`h-0 w-0 border-x-[3.5px] border-t-[4px] border-x-transparent ${
                                    direction === 'desc' ? 'border-t-blue-600' : 'border-t-gray-300'
                                  }`}
                                />
                              </span>
                            </button>
                          </th>
                        )
                      }),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {busy && (
                    <tr>
                      <td colSpan={LEDGER_COLUMNS.length + 1} className="border border-border/60 py-10 text-center text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> 장부를 불러오는 중...
                        </span>
                      </td>
                    </tr>
                  )}
                  {!busy && filtered.length === 0 && (
                    <tr>
                      <td colSpan={LEDGER_COLUMNS.length + 1} className="border border-border/60 py-10 text-center text-sm text-muted-foreground">
                        조회된 장부가 없습니다. “추가”로 새 행을 만드세요.
                      </td>
                    </tr>
                  )}
                  {!busy && visibleRows.map((row) => (
                    <tr key={row.id} className={selected.has(row.id) ? 'bg-rose-50/50' : 'hover:bg-blue-50/40'}>
                      <td
                        style={{ width: SELECT_COL_WIDTH, minWidth: SELECT_COL_WIDTH }}
                        className="border border-border/60 px-2 py-1 text-center"
                      >
                        <input
                          type="checkbox"
                          aria-label={`${row.entryDate} ${row.customerName ?? ''} 선택`}
                          checked={selected.has(row.id)}
                          onChange={() => toggleOne(row.id)}
                          className="h-3.5 w-3.5 align-middle accent-rose-600"
                        />
                      </td>
                      {LEDGER_COLUMNS.map((column) => (
                        <LedgerCell
                          key={column.key}
                          column={column}
                          value={row[column.key]}
                          busy={busyRowId === row.id}
                          onCommit={(next) => commitCell(row, column.key, next)}
                        />
                      ))}
                    </tr>
                  ))}
                </tbody>
                {!busy && filtered.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 font-medium">
                      <td
                        style={{ width: SELECT_COL_WIDTH, minWidth: SELECT_COL_WIDTH }}
                        className="sticky bottom-0 whitespace-nowrap border border-border/60 bg-slate-100 px-2 py-1.5 text-center"
                      >
                        합계
                      </td>
                      {LEDGER_COLUMNS.map((column) => (
                        <td
                          key={column.key}
                          className={`sticky bottom-0 border border-border/60 bg-slate-100 px-1.5 py-1.5 ${
                            column.type === 'number' ? 'text-right tabular-nums' : 'text-center'
                          }`}
                        >
                          {column.type === 'number' ? won(totals[column.key] ?? 0) : ''}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
          {/* 페이지네이션 — 수술자·검사자 리스트와 동일 구성 */}
          <div className="flex flex-wrap items-center gap-2 rounded-b-lg bg-white px-2 py-1.5 text-xs">
            <span className="min-w-[8rem] font-semibold text-gray-800" aria-live="polite">
              {formatCount(filtered.length)}건 {filtered.length > 0 && `· ${formatCount(rangeStart)}-${formatCount(rangeEnd)}`}
              {selected.size > 0 && <span className="ml-2 text-rose-600">· {formatCount(selected.size)}건 선택</span>}
            </span>
            <nav className="flex flex-1 items-center justify-center gap-1" aria-label="페이지 네비게이션">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={safePage <= 1}
                onClick={() => handlePageChange(safePage - 1)}
              >
                이전
              </Button>
              {paginationItems.map((item) => (
                typeof item === 'number' ? (
                  <Button
                    key={item}
                    type="button"
                    variant={item === safePage ? 'default' : 'outline'}
                    size="icon-sm"
                    className="text-xs"
                    aria-current={item === safePage ? 'page' : undefined}
                    onClick={() => handlePageChange(item)}
                  >
                    {item}
                  </Button>
                ) : (
                  <span key={item} className="px-1 text-muted-foreground">...</span>
                )
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                disabled={safePage >= pageMax}
                onClick={() => handlePageChange(safePage + 1)}
              >
                다음
              </Button>
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-gray-700">
                매출 합계 <strong className="tabular-nums">{totals.totalRevenue.toLocaleString('ko-KR')}원</strong>
              </span>
              <label htmlFor="dreamlens-ledger-page-size" className="text-muted-foreground">행 수</label>
              <div className="relative">
                <select
                  id="dreamlens-ledger-page-size"
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
                  className="h-8 w-16 appearance-none rounded-md border border-border/80 bg-white pl-2.5 pr-7 text-xs outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* datalist — 제안만 하고 자유 입력을 막지 않는다. */}
      {LEDGER_COLUMNS.filter((column) => column.suggestions).map((column) => (
        <datalist key={column.key} id={suggestionListId(column.key)}>
          {column.suggestions!.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      ))}
    </div>
  )
}
