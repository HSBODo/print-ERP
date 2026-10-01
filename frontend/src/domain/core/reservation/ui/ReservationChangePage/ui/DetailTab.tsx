import { Download } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useFilter } from '#shared/hooks/useFilter'
import { usePagination } from '#shared/hooks/usePagination'
import { Button } from '#shared/ui/Button'
import { Card, CardContent } from '#shared/ui/Card'
import { Filter } from '#shared/ui/Filter'
import { TablePagination } from '#shared/ui/TablePagination'
import { pad2, todayIso, yearsDesc } from '#shared/utils/date'

import { useReservationChange } from '../../../hooks/useReservationChange'
import { downloadReservationChangeCsv } from '../utils/reservationChangeCsv'
import {
  buildViews,
  changeColumnCount,
  type ChangeFilters,
  type ChangeSort,
  DATA_FROM_YEAR,
} from '../utils/reservationChangeModel'
import { ReservationChangeDetailTable } from './ReservationChangeDetailTable'

const YEAR_OPTIONS = [
  { value: '', label: '연도 전체' },
  ...yearsDesc(DATA_FROM_YEAR)
    .reverse()
    .map((y) => ({ value: String(y), label: `${y}년` })),
]
const MONTH_OPTIONS = [
  { value: '', label: '월 전체' },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: pad2(i + 1),
    label: `${i + 1}월`,
  })),
]
const BRANCH_OPTIONS = [
  { value: '', label: '구분 전체' },
  { value: 'M', label: '시력교정' },
  { value: 'D', label: '드림렌즈' },
  { value: 'H', label: '백내장' },
]
const STATE_OPTIONS = [
  { value: '', label: '상태 전체' },
  { value: 'Y', label: '예약(미내원)' },
  { value: 'I', label: '내원' },
  { value: 'H', label: '퇴원' },
  { value: 'C', label: '취소' },
]
const MIN_CHANGES_OPTIONS = [
  { value: 1, label: '변경 1회 이상' },
  { value: 2, label: '2회 이상' },
  { value: 3, label: '3회 이상' },
  { value: 5, label: '5회 이상' },
  { value: 0, label: '0회 포함 (기준일용)' },
]
const SORT_OPTIONS: { value: ChangeSort; label: string }[] = [
  { value: 'date', label: '등록일순' },
  { value: 'asof', label: '예약일순(기준일 시점)' },
  { value: 'chg', label: '변경횟수순' },
]

const DEFAULT_VIEW: ChangeFilters = {
  month: '',
  asOf: '',
  branch: '',
  state: '',
  minChanges: 1,
  sort: 'date',
  keyword: '',
}

/** 변경 상세 조회 범위(등록일) — 연도 하나 또는 2022-01-01~오늘. */
const rangeOf = (year: string) => {
  const today = todayIso()
  if (!year) return { from: `${DATA_FROM_YEAR}-01-01`, to: today }
  const end = `${year}-12-31`
  return { from: `${year}-01-01`, to: end > today ? today : end }
}

/**
 * 변경 상세 탭 — 등록 연도(또는 전체)만 [조회] 로 서버에서 받고,
 * 월·기준일·구분·상태·변경횟수·정렬·검색은 받아온 행을 바로 거른다.
 */
export function DetailTab() {
  const filter = useFilter({
    defaults: () => ({ year: String(new Date().getFullYear()) }),
    onSearch: () => {
      pagination.resetPage()
    },
    onReset: () => {
      setView(DEFAULT_VIEW)
      pagination.resetPage()
    },
  })
  const [view, setView] = useState<ChangeFilters>(DEFAULT_VIEW)

  const { from, to } = rangeOf(filter.applied.year)
  const { rows, isLoading, isFetching, isError, refetch } =
    useReservationChange(from, to)
  const loading = isLoading || isFetching
  const views = useMemo(() => buildViews(rows, view), [rows, view])
  const maxChanges = useMemo(() => changeColumnCount(views), [views])
  const pagination = usePagination(views)

  const setViewField = <K extends keyof ChangeFilters>(
    key: K,
    value: ChangeFilters[K],
  ) => {
    setView((prev) => ({ ...prev, [key]: value }))
    pagination.resetPage()
  }
  // 기준일을 넣으면 기본 정렬을 '기준일 시점 예약일순' 으로 — 직접 다른 정렬을 골랐으면 그대로 둔다.
  const setAsOf = (asOf: string) => {
    setView((prev) => ({
      ...prev,
      asOf,
      sort: asOf && prev.sort === 'date' ? 'asof' : prev.sort,
    }))
    pagination.resetPage()
  }
  const csv = () =>
    downloadReservationChangeCsv(
      `예약변경이력_${filter.applied.year || '전체'}${view.month ? `-${view.month}` : ''}.csv`,
      views,
      view.asOf,
    )

  return (
    <>
      <Filter.Root filter={filter} isFetching={loading} refetch={refetch}>
        <Filter.Bar>
          <span className="pl-1 text-[11px] text-gray-500">등록기간</span>
          <Filter.Select
            {...filter.field('year')}
            options={YEAR_OPTIONS}
            ariaLabel="등록 연도"
            className="w-[6.5rem]"
          />
          <Filter.Select
            value={view.month}
            onChange={(v) => setViewField('month', v)}
            options={MONTH_OPTIONS}
            ariaLabel="등록 월"
            className="w-[5.5rem]"
          />
          <span className="mx-1 h-6 w-px bg-gray-200" />
          <span className="text-[11px] text-gray-500">기준일</span>
          <input
            type="date"
            aria-label="기준일"
            value={view.asOf}
            min={`${DATA_FROM_YEAR}-01-01`}
            onChange={(e) => setAsOf(e.target.value)}
            className="h-8 rounded-md border border-border/80 bg-white px-2 text-xs text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          <span className="mx-1 h-6 w-px bg-gray-200" />
          <Filter.Select
            value={view.branch}
            onChange={(v) => setViewField('branch', v)}
            options={BRANCH_OPTIONS}
            ariaLabel="구분"
            className="w-[6.5rem]"
          />
          <Filter.Select
            value={view.state}
            onChange={(v) => setViewField('state', v)}
            options={STATE_OPTIONS}
            ariaLabel="상태"
            className="w-[7rem]"
          />
          <Filter.Select
            value={view.minChanges}
            onChange={(v) => setViewField('minChanges', v)}
            options={MIN_CHANGES_OPTIONS}
            ariaLabel="변경횟수"
            className="w-[8.5rem]"
          />
          <Filter.Select
            value={view.sort}
            onChange={(v) => setViewField('sort', v)}
            options={SORT_OPTIONS}
            ariaLabel="정렬"
            className="w-[10rem]"
          />
          <span className="mx-1 h-6 w-px bg-gray-200" />
          <Filter.Keyword
            value={view.keyword}
            onChange={(v) => setViewField('keyword', v)}
            placeholder="이름 · 차트번호 검색"
            className="w-[11rem]"
          />
          <Filter.Count value={views.length}>
            <span className="text-gray-500">
              / 조회 범위 {rows.length.toLocaleString('ko-KR')}건
            </span>
          </Filter.Count>
          <Filter.Actions>
            <Button
              type="button"
              size="sm"
              disabled={views.length === 0}
              className="bg-emerald-600 text-xs text-white hover:bg-emerald-700"
              onClick={csv}
              title="조회 결과 전체를 CSV 로 내려받기(변경별 일시 포함)"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
          </Filter.Actions>
        </Filter.Bar>
      </Filter.Root>

      <Card className="min-h-0 flex-1 border-border/70 py-0 shadow-sm">
        <CardContent className="flex h-full min-h-0 flex-col px-0">
          {isError ? (
            <div className="flex flex-1 items-center justify-center px-3 text-sm text-red-500">
              예약 변경이력을 불러오지 못했습니다.
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto rounded-t-lg border-b border-border/60">
              <ReservationChangeDetailTable
                views={pagination.pageRows}
                maxChanges={maxChanges}
                asOf={view.asOf}
                loading={loading}
                emptyText={
                  rows.length === 0
                    ? '조회 범위에 변경된 예약이 없습니다. 마트 적재(관리자 배치 · 예약 변경이력만) 여부를 확인해 주세요.'
                    : '조건에 맞는 예약이 없습니다.'
                }
              />
            </div>
          )}
          <TablePagination pagination={pagination} className="rounded-b-lg" />
        </CardContent>
      </Card>
    </>
  )
}
