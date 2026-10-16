import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Loader2, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { useFilter } from '#shared/hooks/useFilter'
import { DEFAULT_PAGE_SIZE, usePagination } from '#shared/hooks/usePagination'
import { Button } from '#shared/ui/Button'
import { Card, CardContent } from '#shared/ui/Card'
import { Filter } from '#shared/ui/Filter'
import { TablePagination } from '#shared/ui/TablePagination'
import { columnsToCsv, downloadCsv } from '#shared/utils/csv'
import { todayIso, validateRange } from '#shared/utils/date'

import { dreamlensLedgerApi } from '../../api'
import type { DreamlensLedgerRow } from '../../type/api'
import { LedgerCell } from './LedgerCell'
import {
  emptyRow,
  EXAMINERS,
  frozenLeftOffsets,
  LAST_FROZEN_KEY,
  LEDGER_COLUMNS,
  LEDGER_GROUPS,
  type LedgerFieldKey,
  REVENUE_KEYS,
  suggestionListId,
} from './ledgerColumns'
import {
  compareSortValue,
  csvColumnsOf,
  defaultRange,
  formatCount,
  getSortValue,
  LEDGER_MAX_DAYS,
  matchesKeyword,
  type SortState,
  visitTypeOf,
  visitTypeOptions,
} from './ledgerUtils'

const won = (value: number) =>
  value === 0 ? '' : value.toLocaleString('ko-KR')

/** 체크박스/합계 열 폭 — "합계"가 한 줄에 들어가야 세로로 쪼개지지 않는다. */
const SELECT_COL_WIDTH = 34
/** 자동/수동 배지 칼럼 — 체크박스와 한 칸에 겹쳐 두면 읽기 나빠서 옆으로 뺐다. */
const SOURCE_COL_WIDTH = 34

/** 좌측 고정 컬럼(날짜~이름)의 left 오프셋. 체크박스 열 다음부터 누적된다. */
const FROZEN_LEFT = frozenLeftOffsets(SELECT_COL_WIDTH + SOURCE_COL_WIDTH)
/** border-collapse 에서 고정 셀 테두리가 스크롤 중 사라져 경계는 그림자로 그린다. */
const FROZEN_EDGE_SHADOW = { boxShadow: '1px 0 0 0 #cbd5e1' } as const

export function DreamlensLedgerPage() {
  // 조회 구간만 서버 파라미터다 — [조회] 때 반영(백엔드 92일 제한).
  const filter = useFilter({
    defaults: () => ({ range: defaultRange() }),
    validate: ({ range }) => validateRange(range, { maxDays: LEDGER_MAX_DAYS }),
    onSearch: () => {
      setSelected(new Set())
      pagination.resetPage()
    },
    onReset: () => {
      setVisitType('전체')
      setExaminer('전체')
      setKeyword('')
      setSelected(new Set())
      pagination.setPageSize(DEFAULT_PAGE_SIZE)
      setSortState(null)
    },
  })
  const { from: queryFrom, to: queryTo } = filter.applied.range
  // 진료구분·검사자·검색은 받아온 행을 거르는 클라이언트 필터라 즉시 반영한다(서버 왕복 불필요).
  const [visitType, setVisitType] = useState('전체')
  const [examiner, setExaminer] = useState('전체')
  const [keyword, setKeyword] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [sortState, setSortState] = useState<SortState>(null)

  const queryClient = useQueryClient()
  const queryKey = useMemo(
    () => ['dreamlens-ledger', queryFrom, queryTo],
    [queryFrom, queryTo],
  )

  const { data, error, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      dreamlensLedgerApi.list(queryFrom, queryTo, signal),
    enabled: Boolean(queryFrom && queryTo) && queryFrom <= queryTo,
  })

  const rows = useMemo(() => data ?? [], [data])
  const visitTypes = useMemo(
    () => visitTypeOptions(rows, visitType),
    [rows, visitType],
  )
  const filtered = useMemo(
    () =>
      rows
        .filter(
          (row) =>
            (visitType === '전체' || visitTypeOf(row) === visitType) &&
            (examiner === '전체' || (row.examiner ?? '') === examiner) &&
            matchesKeyword(row, keyword),
        )
        // 최신 날짜가 맨 위. 서버도 같은 순서로 주지만, 행을 추가하거나 날짜를 고친 뒤에도
        // 재조회 없이 자리를 잡게 화면에서 한 번 더 정렬한다(같은 날짜면 나중 입력이 위).
        .sort((a, b) =>
          a.entryDate === b.entryDate
            ? b.id - a.id
            : b.entryDate < a.entryDate
              ? -1
              : 1,
        ),
    [rows, visitType, examiner, keyword],
  )

  /** 헤더를 눌러 고른 정렬. 고르지 않았으면 기본 순서(최신 날짜 위)를 그대로 쓴다. */
  const sorted = useMemo(() => {
    if (!sortState) return filtered
    const { key, direction } = sortState
    return filtered
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const compared = compareSortValue(
          getSortValue(a.row, key),
          getSortValue(b.row, key),
        )
        if (compared !== 0) return direction === 'asc' ? compared : -compared
        return a.index - b.index // 동점이면 기존 순서 유지(정렬이 튀지 않게)
      })
      .map(({ row }) => row)
  }, [filtered, sortState])

  const pagination = usePagination(sorted)

  const setRows = (
    updater: (old: DreamlensLedgerRow[]) => DreamlensLedgerRow[],
  ) =>
    queryClient.setQueryData<DreamlensLedgerRow[]>(queryKey, (old) =>
      updater(old ?? []),
    )

  /**
   * 저장 중인 행 id. mutation.variables 는 "가장 최근 한 건"만 가리켜서,
   * A행 저장 중 B행을 건드리면 A행 잠금이 풀려 이전 편집이 되돌아갈 수 있었다.
   */
  const [pendingRows, setPendingRows] = useState<Set<number>>(new Set())
  const markPending = (id: number, on: boolean) =>
    setPendingRows((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  const updateMutation = useMutation({
    mutationFn: ({ id, row }: { id: number; row: DreamlensLedgerRow }) =>
      dreamlensLedgerApi.update(id, row),
    // 응답을 기다리지 않고 캐시를 먼저 갱신한다 — 다음 편집이 항상 최신 값 위에서 시작된다.
    onMutate: ({ id, row }) => {
      markPending(id, true)
      setRows((old) => old.map((item) => (item.id === id ? row : item)))
    },
    onSuccess: (saved) =>
      setRows((old) => old.map((row) => (row.id === saved.id ? saved : row))),
    // 낙관적으로 반영해 둔 값이 틀렸을 수 있으니 서버 상태로 다시 맞춘다(직접 롤백하면
    // 동시에 진행 중이던 다른 행의 편집까지 되돌릴 수 있다).
    onError: () => {
      toast.error('저장하지 못했습니다. 잠시 후 다시 시도해주세요.')
      queryClient.invalidateQueries({ queryKey })
    },
    onSettled: (_data, _error, variables) => markPending(variables.id, false),
  })

  const createMutation = useMutation({
    mutationFn: () => {
      // 새 행이 조회 구간 밖으로 나가 사라지지 않게 오늘이 구간 안일 때만 오늘로 둔다.
      const now = todayIso()
      const date = now >= queryFrom && now <= queryTo ? now : queryTo
      return dreamlensLedgerApi.create(emptyRow(date))
    },
    onSuccess: (saved) => {
      setRows((old) => [saved, ...old])
      pagination.resetPage() // 새 행은 맨 위 = 1페이지. 다른 페이지에 있었으면 따라간다.
      toast.success('행을 추가했습니다. 맨 위에 있습니다.')
    },
    onError: () => toast.error('행을 추가하지 못했습니다.'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const results = await Promise.allSettled(
        ids.map((id) => dreamlensLedgerApi.remove(id)),
      )
      const removed = ids.filter(
        (_id, index) => results[index].status === 'fulfilled',
      )
      const failed = ids.length - removed.length
      return { removed, failed }
    },
    onSuccess: ({ removed, failed }) => {
      const gone = new Set(removed)
      setRows((old) => old.filter((row) => !gone.has(row.id)))
      setSelected(new Set())
      if (failed > 0)
        toast.error(`${formatCount(failed)}건을 삭제하지 못했습니다.`)
      else toast.success(`${formatCount(removed.length)}건을 삭제했습니다.`)
    },
    onError: () => toast.error('삭제하지 못했습니다.'),
  })

  const busy = isLoading || isFetching

  /**
   * 셀 저장 — 페이로드는 렌더 시점의 행이 아니라 **캐시의 최신 행**으로 만든다.
   * 렌더 클로저를 쓰면 직전 편집이 아직 반영되기 전 값으로 덮어써 편집이 되돌아간다.
   */
  const commitCell = (
    rowId: number,
    key: LedgerFieldKey,
    next: string | number | null,
  ) => {
    const current = (
      queryClient.getQueryData<DreamlensLedgerRow[]>(queryKey) ?? []
    ).find((row) => row.id === rowId)
    if (!current) return
    updateMutation.mutate({ id: rowId, row: { ...current, [key]: next } })
  }

  const totals = useMemo(() => {
    const sums = {} as Record<string, number>
    for (const key of REVENUE_KEYS) {
      sums[key] = filtered.reduce(
        (total, row) => total + Number(row[key] ?? 0),
        0,
      )
    }
    sums.totalRevenue = filtered.reduce(
      (total, row) => total + row.totalRevenue,
      0,
    )
    return sums
  }, [filtered])

  const handleDelete = () => {
    const ids = [...selected]
    if (ids.length === 0) return
    if (
      !window.confirm(
        `선택한 ${formatCount(ids.length)}건을 삭제할까요? 되돌릴 수 없습니다.`,
      )
    )
      return
    deleteMutation.mutate(ids)
  }

  /** 현재 조회·필터·정렬 결과 전체를 CSV로 — 표에 보이는 칼럼/값/순서 그대로(페이지 무관). */
  const handleDownloadCsv = () => {
    downloadCsv(
      `드림렌즈장부_${queryFrom}_${queryTo}.csv`,
      columnsToCsv(csvColumnsOf(), sorted),
    )
  }

  /** 같은 컬럼을 다시 누르면 오름↔내림 토글, 다른 컬럼이면 오름차순부터. */
  const handleSort = (key: LedgerFieldKey) => {
    pagination.resetPage()
    setSortState((prev) =>
      prev?.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )
  }

  // 헤더 체크박스는 "보이는 페이지" 기준 — 안 보이는 페이지까지 한 번에 지우는 사고를 막는다.
  const allChecked =
    pagination.pageRows.length > 0 &&
    pagination.pageRows.every((row) => selected.has(row.id))
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      for (const row of pagination.pageRows) {
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
      <Filter.Root filter={filter} isFetching={busy} refetch={refetch}>
        <Filter.Bar>
          <Filter.DateRange
            {...filter.field('range')}
            maxDays={LEDGER_MAX_DAYS}
            ariaLabel="조회 기간"
          />
          <div className="h-6 w-px bg-border" />
          <Filter.Select
            value={examiner}
            onChange={(value) => {
              setExaminer(value)
              pagination.resetPage()
            }}
            options={[
              { value: '전체', label: '검사자 전체' },
              ...EXAMINERS.map((name) => ({ value: name, label: name })),
            ]}
            ariaLabel="검사자"
            className="w-32"
          />
          <Filter.Keyword
            value={keyword}
            onChange={(value) => {
              setKeyword(value)
              pagination.resetPage()
            }}
            placeholder="이름 · 고객번호 · 검사자"
          />
          <Filter.Count value={filtered.length} />
          <Filter.Actions>
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
              {createMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
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
              {deleteMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              삭제{selected.size > 0 ? ` (${selected.size})` : ''}
            </Button>
          </Filter.Actions>
        </Filter.Bar>
      </Filter.Root>

      {/* 진료구분 — 조회된 행을 바로 거르는 내부 필터. 수술자 리스트와 같이 툴바 아래 한 줄. */}
      <Filter.Bar className="gap-x-2 gap-y-2 border-border/60 bg-gray-50/70 px-2.5 py-2">
        <div title="진료구분 — 조회된 행에 있는 값, 가나다순">
          <Filter.Segment
            value={visitType}
            onChange={(value) => {
              setVisitType(value)
              pagination.resetPage()
            }}
            options={['전체', ...visitTypes]}
            ariaLabel="진료구분"
          />
        </div>
      </Filter.Bar>

      <Card className="min-h-0 flex-1 border-border/70 py-0 shadow-sm">
        <CardContent className="flex h-full min-h-0 flex-col px-0">
          {isError ? (
            <div className="flex flex-1 items-center justify-center px-3 text-center text-sm text-red-500">
              {/* 서버가 이유를 알려주면 그대로 보여준다 — "구간이 너무 넓다" 같은 안내는
                  일반 문구로 덮으면 사용자가 무엇을 고쳐야 할지 알 수 없다. */}
              {error instanceof Error && error.message
                ? error.message
                : '장부를 불러오지 못했습니다. 조회 기간과 API 설정을 확인해주세요.'}
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto rounded-t-lg border-b border-border/60">
              <table className="border-collapse text-[11px]">
                <thead>
                  <tr>
                    <th
                      rowSpan={2}
                      style={{
                        width: SELECT_COL_WIDTH,
                        minWidth: SELECT_COL_WIDTH,
                        left: 0,
                      }}
                      className="sticky top-0 left-0 z-30 whitespace-nowrap border border-border/60 bg-slate-100 px-2 py-1.5"
                    >
                      <input
                        type="checkbox"
                        aria-label="현재 페이지 전체 선택"
                        checked={allChecked}
                        onChange={toggleAll}
                        className="h-3.5 w-3.5 align-middle accent-rose-600"
                      />
                    </th>
                    <th
                      rowSpan={2}
                      style={{
                        width: SOURCE_COL_WIDTH,
                        minWidth: SOURCE_COL_WIDTH,
                        left: SELECT_COL_WIDTH,
                      }}
                      className="sticky top-0 z-30 whitespace-nowrap border border-border/60 bg-slate-100 px-1 py-1.5 text-[10px] font-semibold"
                      title="행 출처 — 자동은 배치가 CRM 내원·수납으로 만든 초안입니다."
                    >
                      구분
                    </th>
                    {LEDGER_GROUPS.map((group) => {
                      // 고정 그룹의 헤더는 그룹 첫 컬럼 위치에 붙인다(그룹 전체가 함께 고정된다).
                      const left = group.frozen
                        ? FROZEN_LEFT.get(group.columns[0].key)
                        : undefined
                      return (
                        <th
                          key={group.id}
                          colSpan={group.columns.length}
                          style={
                            left === undefined
                              ? undefined
                              : { left, ...FROZEN_EDGE_SHADOW }
                          }
                          className={`sticky top-0 border border-border/60 px-2 py-1.5 font-semibold ${group.headClass} ${
                            left === undefined ? 'z-10' : 'sticky z-30'
                          }`}
                        >
                          {group.label}
                        </th>
                      )
                    })}
                  </tr>
                  <tr>
                    {LEDGER_GROUPS.flatMap((group) =>
                      group.columns.map((column) => {
                        const direction =
                          sortState?.key === column.key
                            ? sortState.direction
                            : null
                        const left = FROZEN_LEFT.get(column.key)

                        return (
                          <th
                            key={column.key}
                            aria-sort={
                              direction === 'asc'
                                ? 'ascending'
                                : direction === 'desc'
                                  ? 'descending'
                                  : 'none'
                            }
                            style={{
                              width: column.width,
                              minWidth: column.width,
                              ...(left === undefined ? {} : { left }),
                              ...(column.key === LAST_FROZEN_KEY
                                ? FROZEN_EDGE_SHADOW
                                : {}),
                            }}
                            className={`sticky top-[31px] whitespace-nowrap border border-border/60 px-1.5 py-1.5 text-center font-medium ${group.headClass} ${
                              left === undefined ? 'z-10' : 'sticky z-30'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleSort(column.key)}
                              title={`${column.label} 기준 정렬`}
                              className="inline-flex w-full items-center justify-center gap-1 text-[11px] font-medium text-gray-800 transition-colors hover:text-blue-700 focus-visible:outline-none"
                            >
                              <span>{column.label}</span>
                              <span
                                className="flex h-3.5 w-2.5 shrink-0 flex-col items-center justify-center gap-[1px]"
                                aria-hidden="true"
                              >
                                <span
                                  className={`h-0 w-0 border-x-[3.5px] border-b-[4px] border-x-transparent ${
                                    direction === 'asc'
                                      ? 'border-b-blue-600'
                                      : 'border-b-gray-300'
                                  }`}
                                />
                                <span
                                  className={`h-0 w-0 border-x-[3.5px] border-t-[4px] border-x-transparent ${
                                    direction === 'desc'
                                      ? 'border-t-blue-600'
                                      : 'border-t-gray-300'
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
                      <td
                        colSpan={LEDGER_COLUMNS.length + 2}
                        className="border border-border/60 py-10 text-center text-sm text-muted-foreground"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> 장부를
                          불러오는 중...
                        </span>
                      </td>
                    </tr>
                  )}
                  {!busy && filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={LEDGER_COLUMNS.length + 2}
                        className="border border-border/60 py-10 text-center text-sm text-muted-foreground"
                      >
                        조회된 장부가 없습니다. “추가”로 새 행을 만드세요.
                      </td>
                    </tr>
                  )}
                  {!busy &&
                    pagination.pageRows.map((row) => {
                      const isSelected = selected.has(row.id)
                      // 배치 초안(AUTO) 행 — CRM 내원·수납으로 자동 생성됨. 렌즈 정보 보완 필요.
                      // 어느 셀이든 수정하면 서버가 MANUAL 로 승격해 뱃지가 사라진다.
                      const isAuto = row.source === 'AUTO'
                      // 고정 셀은 뒤 내용이 비치므로 불투명 배경이 필요하다.
                      // 행 hover 는 group-hover 로 고정 셀에도 그대로 전달한다.
                      const frozenBg = isSelected
                        ? 'bg-rose-50'
                        : isAuto
                          ? 'bg-amber-50 group-hover:bg-blue-50'
                          : 'bg-white group-hover:bg-blue-50'

                      return (
                        <tr
                          key={row.id}
                          className={`group ${isSelected ? 'bg-rose-50/50' : isAuto ? 'bg-amber-50/40 hover:bg-blue-50/40' : 'hover:bg-blue-50/40'}`}
                        >
                          <td
                            style={{
                              width: SELECT_COL_WIDTH,
                              minWidth: SELECT_COL_WIDTH,
                              left: 0,
                            }}
                            className={`sticky left-0 z-10 border border-border/60 px-2 py-1 text-center ${frozenBg}`}
                          >
                            <input
                              type="checkbox"
                              aria-label={`${row.entryDate} ${row.customerName ?? ''} 선택`}
                              checked={isSelected}
                              onChange={() => toggleOne(row.id)}
                              className="h-3.5 w-3.5 align-middle accent-rose-600"
                            />
                          </td>
                          <td
                            style={{
                              width: SOURCE_COL_WIDTH,
                              minWidth: SOURCE_COL_WIDTH,
                              left: SELECT_COL_WIDTH,
                            }}
                            className={`sticky z-10 border border-border/60 px-1 py-1 text-center ${frozenBg}`}
                          >
                            <span
                              title={
                                isAuto
                                  ? '배치가 CRM 내원·수납으로 만든 초안입니다. 셀을 고치면 수기로 바뀝니다.'
                                  : '사람이 입력하거나 수정한 행입니다. 배치가 덮어쓰지 않습니다.'
                              }
                              className={`inline-block rounded px-1 text-[9px] font-semibold leading-4 ${
                                isAuto
                                  ? 'bg-amber-200/80 text-amber-900'
                                  : 'bg-slate-200/80 text-slate-700'
                              }`}
                            >
                              {isAuto ? '자동' : '수기'}
                            </span>
                          </td>
                          {LEDGER_COLUMNS.map((column) => (
                            <LedgerCell
                              key={column.key}
                              column={column}
                              value={row[column.key]}
                              busy={pendingRows.has(row.id)}
                              onCommit={(next) =>
                                commitCell(row.id, column.key, next)
                              }
                              stickyLeft={FROZEN_LEFT.get(column.key)}
                              stickyBgClass={frozenBg}
                              frozenEdge={column.key === LAST_FROZEN_KEY}
                            />
                          ))}
                        </tr>
                      )
                    })}
                </tbody>
                {!busy && filtered.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-100 font-medium">
                      {/* 좌하단 모서리 — 세로·가로 양쪽 고정이라 z 를 가장 높게 둔다. */}
                      <td
                        style={{
                          width: SELECT_COL_WIDTH,
                          minWidth: SELECT_COL_WIDTH,
                          left: 0,
                        }}
                        className="sticky bottom-0 left-0 z-30 whitespace-nowrap border border-border/60 bg-slate-100 px-2 py-1.5 text-center"
                      >
                        합계
                      </td>
                      <td
                        style={{
                          width: SOURCE_COL_WIDTH,
                          minWidth: SOURCE_COL_WIDTH,
                          left: SELECT_COL_WIDTH,
                        }}
                        className="sticky bottom-0 z-30 border border-border/60 bg-slate-100 px-1 py-1.5"
                      />
                      {LEDGER_COLUMNS.map((column) => {
                        const left = FROZEN_LEFT.get(column.key)
                        return (
                          <td
                            key={column.key}
                            style={{
                              ...(left === undefined ? {} : { left }),
                              ...(column.key === LAST_FROZEN_KEY
                                ? FROZEN_EDGE_SHADOW
                                : {}),
                            }}
                            className={`sticky bottom-0 border border-border/60 bg-slate-100 px-1.5 py-1.5 ${
                              column.type === 'number'
                                ? 'text-right tabular-nums'
                                : 'text-center'
                            } ${left === undefined ? '' : 'z-30'}`}
                          >
                            {column.type === 'number'
                              ? won(totals[column.key] ?? 0)
                              : ''}
                          </td>
                        )
                      })}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
          <div className="flex items-center gap-2 rounded-b-lg bg-white pr-2 text-xs">
            <TablePagination pagination={pagination} className="flex-1" />
            {selected.size > 0 && (
              <span className="text-rose-600">
                {formatCount(selected.size)}건 선택
              </span>
            )}
            <span className="whitespace-nowrap text-gray-700">
              매출 합계{' '}
              <strong className="tabular-nums">
                {totals.totalRevenue.toLocaleString('ko-KR')}원
              </strong>
            </span>
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
