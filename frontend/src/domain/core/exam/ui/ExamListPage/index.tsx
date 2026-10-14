import { Download } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useFilter } from '#shared/hooks/useFilter'
import { DEFAULT_PAGE_SIZE, usePagination } from '#shared/hooks/usePagination'
import { Button } from '#shared/ui/Button'
import { Card, CardContent } from '#shared/ui/Card'
import { Filter } from '#shared/ui/Filter'
import { TablePagination } from '#shared/ui/TablePagination'
import { columnsToCsv, downloadCsv } from '#shared/utils/csv'
import { thisMonthRange } from '#shared/utils/date'

import { useExamList } from '../../hooks/useExamList'
import type { ExamListItem } from '../../type/api'
import {
  compareSortValue,
  dash,
  EXAM_CATEGORY_OPTIONS,
  formatExamType,
  getSortValue,
  SKELETON_ROWS,
  type SortState,
} from '../../utils/examListUtils'
import { ALIGN, COLUMNS, HEADER_ALIGN } from './examListColumns'

/**
 * 검사자 리스트 — 성민CRM "검사자 리스트(상담사별)" 화면.
 * 소스: EXAM+CUSTOM+OPERATIONDATA+EMPLOYEE (docs/db/검사자리스트-컬럼정의.md).
 * 검사정보1~30(측정값) 제외, 비측정 48열(만나이는 생년월일에서 파생).
 * 데이터: useExamList(from,to) — 운영은 /api/exam-list (데이터소스 목 토글 시 정적 픽스처).
 */

export function ExamListPage() {
  // 검사 기간만 조회 조건, 검사 분류·진료구분·검색은 받아온 행을 바로 거른다.
  const filter = useFilter({
    defaults: () => ({ range: thisMonthRange() }),
    onSearch: () => {
      pagination.resetPage()
    },
    onReset: () => {
      setCategory('전체')
      setType('전체')
      setKeyword('')
      pagination.setPageSize(DEFAULT_PAGE_SIZE)
      setSortState(null)
    },
  })
  const { range } = filter.applied
  const [category, setCategory] = useState('전체')
  const [type, setType] = useState('전체')
  const [keyword, setKeyword] = useState('')
  const [sortState, setSortState] = useState<SortState>(null)

  const { rows, isLoading, isFetching, isError, refetch } = useExamList(
    range.from,
    range.to,
  )
  const showSkeleton = isLoading || isFetching

  const typeOptions = useMemo(() => {
    const set = new Set(
      rows.map((r) => formatExamType(r.examType)).filter(Boolean),
    )
    return ['전체', ...[...set].sort((a, b) => a.localeCompare(b, 'ko'))]
  }, [rows])

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    return rows.filter((r) => {
      if (category !== '전체' && r.examCategory !== category) return false
      if (type !== '전체' && formatExamType(r.examType) !== type) return false
      if (!q) return true
      return (
        r.name.toLowerCase().includes(q) ||
        r.chartNo.includes(q) ||
        r.phone2.includes(q)
      )
    })
  }, [rows, category, type, keyword])

  const tableRows = filtered

  const sortedRows = useMemo(() => {
    if (!sortState) return tableRows

    return tableRows
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const compared = compareSortValue(
          getSortValue(a.row, sortState.key, a.index),
          getSortValue(b.row, sortState.key, b.index),
        )
        if (compared !== 0)
          return sortState.direction === 'asc' ? compared : -compared
        return a.index - b.index
      })
      .map(({ row }) => row)
  }, [tableRows, sortState])

  const pagination = usePagination(sortedRows)

  // 현재 조회·필터·정렬 결과 전체(페이지 무관)를 CSV로 — 표에 보이는 칼럼/값 그대로.
  const handleDownloadCsv = () => {
    downloadCsv(
      `검사자리스트_${range.from}_${range.to}.csv`,
      columnsToCsv(COLUMNS, sortedRows),
    )
  }

  const handleSort = (key: string) => {
    pagination.resetPage()
    setSortState((prev) =>
      prev?.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[32rem] flex-col gap-3 overflow-hidden text-xs text-gray-800">
      <Filter.Root filter={filter} isFetching={showSkeleton} refetch={refetch}>
        <Filter.Bar>
          <Filter.DateRange {...filter.field('range')} ariaLabel="검사 기간" />
          <div className="h-6 w-px bg-border" />
          <Filter.Segment
            value={category}
            onChange={(value) => {
              setCategory(value)
              pagination.resetPage()
            }}
            options={EXAM_CATEGORY_OPTIONS}
            ariaLabel="검사 분류"
          />
          <Filter.Select
            value={type}
            onChange={(value) => {
              setType(value)
              pagination.resetPage()
            }}
            options={typeOptions.map((t) => ({
              value: t,
              label: t === '전체' ? '진료구분 전체' : t,
            }))}
            ariaLabel="진료구분"
            className="w-32"
          />
          <Filter.Keyword
            value={keyword}
            onChange={(value) => {
              setKeyword(value)
              pagination.resetPage()
            }}
            placeholder="고객명 · 차트번호 · 연락처"
            className="w-[15rem]"
          />
          <Filter.Count value={tableRows.length} />
          <Filter.Actions>
            <Button
              type="button"
              size="sm"
              disabled={sortedRows.length === 0}
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
                      const activeDirection =
                        sortState?.key === col.key ? sortState.direction : null

                      return (
                        <th
                          key={col.key}
                          aria-sort={
                            activeDirection === 'asc'
                              ? 'ascending'
                              : activeDirection === 'desc'
                                ? 'descending'
                                : 'none'
                          }
                          className={`sticky top-0 z-10 whitespace-nowrap border-b border-border/60 bg-gray-50 px-2.5 py-1.5 font-semibold ${ALIGN[col.align ?? 'left']}`}
                          style={{ minWidth: col.min }}
                        >
                          <button
                            type="button"
                            className={`inline-flex w-full items-center gap-1 text-[11px] font-semibold text-gray-800 transition-colors hover:text-blue-700 focus-visible:outline-none ${HEADER_ALIGN[col.align ?? 'left']}`}
                            onClick={() => handleSort(col.key)}
                          >
                            <span>{col.label}</span>
                            <span
                              className="flex h-3.5 w-2.5 flex-col items-center justify-center gap-[1px]"
                              aria-hidden="true"
                            >
                              <span
                                className={`h-0 w-0 border-x-[3.5px] border-b-[4px] border-x-transparent ${
                                  activeDirection === 'asc'
                                    ? 'border-b-blue-600'
                                    : 'border-b-gray-300'
                                }`}
                              />
                              <span
                                className={`h-0 w-0 border-x-[3.5px] border-t-[4px] border-x-transparent ${
                                  activeDirection === 'desc'
                                    ? 'border-t-blue-600'
                                    : 'border-t-gray-300'
                                }`}
                              />
                            </span>
                          </button>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {showSkeleton &&
                    Array.from(
                      { length: Math.max(pagination.pageSize, SKELETON_ROWS) },
                      (_, rowIndex) => (
                        <tr
                          key={`exam-list-skeleton-${rowIndex}`}
                          className="border-b border-border/40"
                        >
                          {COLUMNS.map((col) => (
                            <td
                              key={col.key}
                              className="whitespace-nowrap px-2.5 py-1"
                              style={{ minWidth: col.min }}
                            >
                              <span className="exam-skeleton-bar block h-2.5 w-full rounded" />
                            </td>
                          ))}
                        </tr>
                      ),
                    )}
                  {!showSkeleton &&
                    pagination.pageRows.map((row, i) => {
                      const rowNumber = pagination.rangeStart + i

                      return (
                        <tr
                          key={`${row.chartNo}-${i}`}
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
                                : dash(
                                    String(
                                      row[col.key as keyof ExamListItem] ?? '',
                                    ),
                                  )}
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  {!showSkeleton && tableRows.length === 0 && (
                    <tr>
                      <td
                        colSpan={COLUMNS.length}
                        className="px-3 py-12 text-center text-sm text-muted-foreground"
                      >
                        검색 결과가 없습니다.
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
