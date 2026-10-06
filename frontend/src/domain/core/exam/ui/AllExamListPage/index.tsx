import { Download } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useFilter } from '#shared/hooks/useFilter'
import { DEFAULT_PAGE_SIZE, usePagination } from '#shared/hooks/usePagination'
import { Button } from '#shared/ui/Button'
import { Card, CardContent } from '#shared/ui/Card'
import { Filter } from '#shared/ui/Filter'
import { TablePagination } from '#shared/ui/TablePagination'
import { columnsToCsv, downloadCsv } from '#shared/utils/csv'
import { currentMonth, monthRange, shiftMonth } from '#shared/utils/date'

import { useAllExamList } from '../../hooks/useAllExamList'
import type { AllExamListItem } from '../../type/api'
import {
  calcAge,
  compareSortValue,
  GROUP_FILTERS,
  matchesExamGroup,
  type SortState,
} from '../../utils/examListUtils'
import { ALIGN, COLUMNS, HEADER_ALIGN } from './allExamListColumns'

// 기본 조회 기간 = 오늘 기준 전월 전체 (예: 7월이면 2026-06-01 ~ 2026-06-30)
const previousMonthRange = () => monthRange(shiftMonth(currentMonth(), -1))

/**
 * 전체 검사자 리스트 — 시력교정(EXAM) + 백내장(Cataract_Exam) 통합 명단.
 * 모집단이 월별 검사자 종합지표와 동일해, 검사구분·내원동기·직업 토글의 조회건수가
 * 레포트 검사유입·검사수 수치와 정합한다. (상세 컬럼은 기존 개별 리스트 유지)
 */

const ONEDAY_FILTERS = ['전체', '원데이', '일반'] as const
const INTRO_FILTERS = ['전체', '일반', '고객소개', '직원소개'] as const
const JOB_FILTERS = ['전체', '직장인', '학생', '기타'] as const
const PATIENT_FILTERS = ['전체', '신환', '구환'] as const

const sortValue = (
  r: AllExamListItem,
  key: string,
  originalIndex: number,
): string | number => {
  if (key === 'rowNo') return originalIndex
  if (key === 'age') {
    const age = Number(calcAge(r.birth))
    return Number.isFinite(age) ? age : ''
  }
  return ((r as Record<string, string | undefined>)[key] ?? '').trim()
}

export function AllExamListPage() {
  // 검사 기간만 조회 조건, 아래 토글·검색은 받아온 행을 바로 거른다.
  const filter = useFilter({
    defaults: () => ({ range: previousMonthRange() }),
    onSearch: () => {
      pagination.resetPage()
    },
    onReset: () => {
      setExamGroup('전체')
      setOneDayFilter('전체')
      setIntroType('전체')
      setJobBucket('전체')
      setPatientType('전체')
      setKeyword('')
      pagination.setPageSize(DEFAULT_PAGE_SIZE)
      setSortState(null)
    },
  })
  const { range } = filter.applied

  const [examGroup, setExamGroup] = useState<string>('전체')
  const [oneDayFilter, setOneDayFilter] = useState<string>('전체')
  const [introType, setIntroType] = useState<string>('전체')
  const [jobBucket, setJobBucket] = useState<string>('전체')
  const [patientType, setPatientType] = useState<string>('전체')
  const [keyword, setKeyword] = useState('')

  const [sortState, setSortState] = useState<SortState>(null)

  const { rows, isLoading, isFetching, isError, refetch } = useAllExamList(
    range.from,
    range.to,
  )
  const showLoading = isLoading || isFetching

  // 토글 필터(즉시 반영) + 키워드
  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    return rows.filter((r) => {
      if (!matchesExamGroup(r, examGroup)) return false
      if (oneDayFilter !== '전체' && r.examType !== oneDayFilter) return false
      if (introType !== '전체' && r.introType !== introType) return false
      if (jobBucket !== '전체' && r.jobBucket !== jobBucket) return false
      if (patientType !== '전체' && r.patientType !== patientType) return false
      if (!q) return true
      return (
        r.name.toLowerCase().includes(q) ||
        r.chartNo.includes(q) ||
        r.phone2.includes(q)
      )
    })
  }, [
    rows,
    examGroup,
    oneDayFilter,
    introType,
    jobBucket,
    patientType,
    keyword,
  ])

  const sorted = useMemo(() => {
    if (!sortState) return filtered
    const { key, direction } = sortState
    return filtered
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const compared = compareSortValue(
          sortValue(a.row, key, a.index),
          sortValue(b.row, key, b.index),
        )
        if (compared !== 0) return direction === 'asc' ? compared : -compared
        return a.index - b.index
      })
      .map(({ row }) => row)
  }, [filtered, sortState])

  const pagination = usePagination(sorted)

  const handleSort = (key: string) => {
    pagination.resetPage()
    setSortState((prev) =>
      prev?.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )
  }

  const handleDownloadCsv = () => {
    downloadCsv(
      `전체검사자리스트_${range.from}_${range.to}.csv`,
      columnsToCsv(COLUMNS, sorted),
    )
  }

  // 토글 버튼 그룹 (컴포넌트 본문 내 클로저 — react-refresh 영향 없음)
  const filterGroup = (
    label: string,
    options: readonly string[],
    value: string,
    onChange: (v: string) => void,
  ) => (
    <div className="flex items-center gap-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <Filter.Segment
        value={value}
        onChange={(v) => {
          onChange(v)
          pagination.resetPage()
        }}
        options={options}
        ariaLabel={label}
      />
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[32rem] flex-col gap-3 overflow-hidden text-xs text-gray-800">
      {/* 툴바: 기간 · 검색 · 조회건수 · 액션 */}
      <Filter.Root filter={filter} isFetching={showLoading} refetch={refetch}>
        <Filter.Bar>
          <Filter.DateRange {...filter.field('range')} ariaLabel="검사 기간" />
          <Filter.Keyword
            value={keyword}
            onChange={(value) => {
              setKeyword(value)
              pagination.resetPage()
            }}
            placeholder="고객명 · 차트번호 · 연락처"
            className="w-[12rem]"
          />
          <Filter.Count value={filtered.length} />
          <Filter.Actions>
            <Button
              type="button"
              size="sm"
              disabled={sorted.length === 0}
              className="bg-emerald-600 text-xs text-white hover:bg-emerald-700"
              onClick={handleDownloadCsv}
              title="조회 결과 전체를 CSV로 내려받기"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
          </Filter.Actions>
        </Filter.Bar>
      </Filter.Root>

      {/* 상세 필터 (토글) — 툴바 아래 한 줄 */}
      <Filter.Bar className="gap-x-4 gap-y-2 border-border/60 bg-gray-50/70 px-2.5 py-2">
        {filterGroup('검사', GROUP_FILTERS, examGroup, setExamGroup)}
        {filterGroup('원데이', ONEDAY_FILTERS, oneDayFilter, setOneDayFilter)}
        {filterGroup('동기', INTRO_FILTERS, introType, setIntroType)}
        {filterGroup('직업', JOB_FILTERS, jobBucket, setJobBucket)}
        {filterGroup('환자', PATIENT_FILTERS, patientType, setPatientType)}
      </Filter.Bar>

      {/* 상세 테이블 */}
      <Card className="min-h-0 flex-1 border-border/70 py-0 shadow-sm">
        <CardContent className="flex h-full min-h-0 flex-col px-0">
          {isError ? (
            <div className="flex flex-1 items-center justify-center px-3 text-sm text-red-500">
              데이터를 불러오지 못했습니다.
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto rounded-t-lg border-b border-border/60">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-gray-50 text-[11px] text-gray-700">
                    {COLUMNS.map((col) => {
                      const dir =
                        sortState?.key === col.key ? sortState.direction : null
                      return (
                        <th
                          key={col.key}
                          className={`sticky top-0 z-10 whitespace-nowrap border-b border-border/60 bg-gray-50 px-2.5 py-1.5 font-semibold ${ALIGN[col.align ?? 'left']}`}
                          style={{ minWidth: col.min }}
                        >
                          <button
                            type="button"
                            className={`inline-flex w-full items-center gap-1 text-[11px] font-semibold text-gray-800 transition-colors hover:text-blue-700 ${HEADER_ALIGN[col.align ?? 'left']}`}
                            onClick={() => handleSort(col.key)}
                          >
                            <span>{col.label}</span>
                            <span
                              className="flex h-3.5 w-2.5 flex-col items-center justify-center gap-[1px]"
                              aria-hidden="true"
                            >
                              <span
                                className={`h-0 w-0 border-x-[3.5px] border-b-[4px] border-x-transparent ${dir === 'asc' ? 'border-b-blue-600' : 'border-b-gray-300'}`}
                              />
                              <span
                                className={`h-0 w-0 border-x-[3.5px] border-t-[4px] border-x-transparent ${dir === 'desc' ? 'border-t-blue-600' : 'border-t-gray-300'}`}
                              />
                            </span>
                          </button>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {showLoading && (
                    <tr>
                      <td
                        colSpan={COLUMNS.length}
                        className="px-3 py-12 text-center text-sm text-muted-foreground"
                      >
                        불러오는 중…
                      </td>
                    </tr>
                  )}
                  {!showLoading &&
                    pagination.pageRows.map((row, i) => {
                      const rowNumber = pagination.rangeStart + i
                      return (
                        <tr
                          key={`${row.chartNo}-${row.examGroup}-${row.examDate}-${i}`}
                          className="border-b border-border/40 transition-colors hover:bg-blue-50/40"
                        >
                          {COLUMNS.map((col) => (
                            <td
                              key={col.key}
                              className={`whitespace-nowrap px-2.5 py-1 text-[11px] text-gray-800 ${ALIGN[col.align ?? 'left']}`}
                              style={{ minWidth: col.min }}
                            >
                              {col.render
                                ? col.render(row, rowNumber)
                                : dashCell(row, col.key)}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  {!showLoading && filtered.length === 0 && (
                    <tr>
                      <td
                        colSpan={COLUMNS.length}
                        className="px-3 py-12 text-center text-sm text-muted-foreground"
                      >
                        조회 결과가 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <TablePagination pagination={pagination} className="rounded-b-lg" />
        </CardContent>
      </Card>
    </div>
  )
}

const dashCell = (row: AllExamListItem, key: string) => {
  const v = (row as Record<string, string | undefined>)[key] ?? ''
  return v.trim() ? v : '—'
}
