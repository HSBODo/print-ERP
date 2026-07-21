import { useMemo, useState } from 'react'
import { ChevronDown, Download, RotateCcw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { columnsToCsv, downloadCsv } from '@/utils/csv'
import { useSurgeryList } from '@/hooks/surgery/useSurgeryList'
import { useWeeklyApproval } from '@/hooks/useWeeklyApproval'
import { WeeklyApprovalPanel } from '@/components/stats/WeeklyApprovalPanel'
import type { SurgeryListItem } from '@/api/surgery/surgeryList'
import { COLUMNS, ALIGN, HEADER_ALIGN } from './surgeryListColumns'
import {
  dash,
  surgeryDateOf,
  formatCount,
  CATEGORY_OPTIONS,
  defaultFrom,
  defaultTo,
  PAGE_SIZE_OPTIONS,
  SKELETON_ROWS,
  QUICK_RANGES,
  toMonthValue,
  toMonthStart,
  toMonthEnd,
  toMonthWeekRange,
  buildPaginationItems,
  getSortValue,
  compareSortValue,
  type PeriodMode,
  type QuickRangeKey,
  type SortState,
} from './surgeryListUtils'

export function SurgeryListPage() {
  const [draftPeriodMode, setDraftPeriodMode] = useState<PeriodMode>('daily')
  const [activeQuickRange, setActiveQuickRange] = useState<QuickRangeKey | null>(null)
  const [draftFrom, setDraftFrom] = useState(defaultFrom)
  const [draftTo, setDraftTo] = useState(defaultTo)
  const [draftCategory, setDraftCategory] = useState('전체')
  const [draftKeyword, setDraftKeyword] = useState('')
  const [queryFrom, setQueryFrom] = useState(defaultFrom)
  const [queryTo, setQueryTo] = useState(defaultTo)
  const [queryCategory, setQueryCategory] = useState('전체')
  const [queryKeyword, setQueryKeyword] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [sortState, setSortState] = useState<SortState>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const { rows, isLoading, isFetching, isError } = useSurgeryList(queryFrom, queryTo, hasSearched)
  const showSkeleton = hasSearched && (isLoading || isFetching)

  const filtered = useMemo(() => {
    const q = queryKeyword.trim().toLowerCase()
    return rows.filter((r) => {
      if (queryCategory !== '전체' && r.surgeryCategory !== queryCategory) return false
      if (!q) return true
      return r.name.toLowerCase().includes(q) || r.chartNo.includes(q) || r.phone2.includes(q)
    })
  }, [rows, queryCategory, queryKeyword])

  // 주별 승인(주차 버킷 + 승인/선택) — 수술일 기준. 같은 달 조회일 때만 패널 노출(weeksInRange 제약).
  const approval = useWeeklyApproval(filtered, surgeryDateOf, queryFrom, queryTo)
  const sameMonth = queryFrom.slice(0, 7) === queryTo.slice(0, 7)
  const showApproval = hasSearched && !isError && !showSkeleton && sameMonth
  // 선택 주차로 거른 행이 표/페이지네이션 소스(미선택 시 filtered 그대로)
  const tableRows = approval.selectedRows

  const sortedRows = useMemo(() => {
    if (!sortState) return tableRows
    return tableRows
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const compared = compareSortValue(
          getSortValue(a.row, sortState.key, a.index),
          getSortValue(b.row, sortState.key, b.index),
        )
        if (compared !== 0) return sortState.direction === 'asc' ? compared : -compared
        return a.index - b.index
      })
      .map(({ row }) => row)
  }, [tableRows, sortState])

  const pageMax = Math.max(1, Math.ceil(tableRows.length / pageSize))
  const safePage = Math.min(currentPage, pageMax)
  const paginationItems = useMemo(() => buildPaginationItems(safePage, pageMax), [safePage, pageMax])
  const visibleRows = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return sortedRows.slice(start, start + pageSize)
  }, [safePage, sortedRows, pageSize])
  const rangeStart = tableRows.length === 0 ? 0 : (safePage - 1) * pageSize + 1
  const rangeEnd = Math.min(safePage * pageSize, tableRows.length)
  const visibleQuickRanges = draftPeriodMode === 'daily' ? QUICK_RANGES : []

  const handleSearch = () => {
    setHasSearched(true)
    setCurrentPage(1)
    approval.clearSelection()
    setQueryFrom(draftPeriodMode === 'monthly' ? toMonthStart(toMonthValue(draftFrom)) : draftFrom)
    setQueryTo(draftPeriodMode === 'monthly' ? toMonthEnd(toMonthValue(draftTo)) : draftTo)
    setQueryCategory(draftCategory)
    setQueryKeyword(draftKeyword)
  }

  const handleReset = () => {
    setDraftPeriodMode('daily')
    setActiveQuickRange(null)
    setDraftFrom(defaultFrom())
    setDraftTo(defaultTo())
    setDraftCategory('전체')
    setDraftKeyword('')
    setQueryFrom(defaultFrom())
    setQueryTo(defaultTo())
    setQueryCategory('전체')
    setQueryKeyword('')
    setPageSize(50)
    setCurrentPage(1)
    approval.reset()
    setHasSearched(false)
  }

  // 현재 조회·필터·정렬 결과 전체(페이지 무관)를 CSV로 — 표에 보이는 칼럼/값 그대로.
  const handleDownloadCsv = () => {
    downloadCsv(`수술자리스트_${queryFrom}_${queryTo}.csv`, columnsToCsv(COLUMNS, sortedRows))
  }

  const handleSort = (key: string) => {
    setCurrentPage(1)
    setSortState((prev) => (
      prev?.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    ))
  }

  const handlePeriodModeChange = (mode: PeriodMode) => {
    setDraftPeriodMode(mode)
    setActiveQuickRange(null)
    if (mode === 'monthly') {
      setDraftFrom(toMonthStart(toMonthValue(draftFrom)))
      setDraftTo(toMonthEnd(toMonthValue(draftTo)))
    }
  }

  const handleQuickRange = (key: QuickRangeKey) => {
    setActiveQuickRange(key)
    if (key === 'monthly') {
      setDraftPeriodMode('daily')
      setDraftFrom(toMonthStart(toMonthValue(draftFrom)))
      setDraftTo(toMonthEnd(toMonthValue(draftTo)))
      return
    }

    const week = Number(key.replace('w', ''))
    const { from, to } = toMonthWeekRange(toMonthValue(draftFrom), week)
    setDraftPeriodMode('daily')
    setDraftFrom(from)
    setDraftTo(to)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.min(Math.max(page, 1), pageMax))
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[32rem] flex-col gap-3 overflow-hidden text-xs text-gray-800">
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
              <option value="monthly">월별</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          </div>
          {draftPeriodMode === 'monthly' ? (
            <input
              aria-label="수술 기준 월"
              type="month"
              value={toMonthValue(draftFrom)}
              onChange={(e) => {
                if (!e.target.value) return
                setActiveQuickRange(null)
                setDraftFrom(toMonthStart(e.target.value))
                setDraftTo(toMonthEnd(e.target.value))
              }}
              className="h-8 w-[8.2rem] rounded-md border border-border/80 bg-white px-2 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          ) : (
            <>
              <input
                aria-label="수술 시작일"
                type="date"
                value={draftFrom}
                onChange={(e) => {
                  setActiveQuickRange(null)
                  setDraftFrom(e.target.value)
                }}
                className="h-8 w-[8.2rem] rounded-md border border-border/80 bg-white px-2 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <span className="text-gray-400">~</span>
              <input
                aria-label="수술 종료일"
                type="date"
                value={draftTo}
                onChange={(e) => {
                  setActiveQuickRange(null)
                  setDraftTo(e.target.value)
                }}
                className="h-8 w-[8.2rem] rounded-md border border-border/80 bg-white px-2 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </>
          )}
        </div>
        {visibleQuickRanges.length > 0 && (
          <div className="flex h-8 overflow-hidden rounded-md border border-border/80 bg-white">
            {visibleQuickRanges.map((range, index) => (
              <button
                key={range.key}
                type="button"
                className={`min-w-10 border-l border-border/70 px-2 text-xs font-medium transition-colors first:border-l-0 ${
                  activeQuickRange === range.key ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-950'
                } ${index === visibleQuickRanges.length - 1 ? 'min-w-12' : ''}`}
                onClick={() => handleQuickRange(range.key)}
              >
                {range.label}
              </button>
            ))}
          </div>
        )}
        <div className="h-6 w-px bg-border" />
        <div className="flex h-8 overflow-hidden rounded-md border border-border/80 bg-white">
          {CATEGORY_OPTIONS.map((category) => (
            <button
              key={category}
              type="button"
              aria-pressed={draftCategory === category}
              className={`min-w-[4.25rem] border-l border-border/70 px-2 text-xs font-medium transition-colors first:border-l-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100 ${
                draftCategory === category ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-950'
              }`}
              onClick={() => setDraftCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="flex h-8 overflow-hidden rounded-md border border-border/80 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
          <input
            type="text"
            value={draftKeyword}
            onChange={(e) => setDraftKeyword(e.target.value)}
            placeholder="고객명 · 차트번호 · 연락처"
            className="h-full w-[15.1rem] border-0 bg-white px-3 text-xs outline-none placeholder:text-gray-400"
          />
        </div>
        <div className="flex h-8 items-center gap-2 rounded-md border border-border/80 bg-white px-3 text-xs" aria-live="polite">
          <span className="text-muted-foreground">조회건수</span>
          <strong className="tabular-nums text-gray-900">{formatCount(tableRows.length)}건</strong>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Button type="button" variant="outline" size="sm" className="text-xs" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            초기화
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isLoading}
            className="bg-blue-600 text-xs text-white hover:bg-blue-700"
            onClick={handleSearch}
          >
            <Search className="h-3.5 w-3.5" />
            조회 (F1)
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!hasSearched || sortedRows.length === 0}
            className="bg-emerald-600 text-xs text-white hover:bg-emerald-700"
            onClick={handleDownloadCsv}
            title="조회 결과 전체를 CSV로 내려받기"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
        </div>
      </div>

      {showApproval && (
        <WeeklyApprovalPanel
          weeks={approval.weeks}
          approved={approval.approved}
          selectedWeek={approval.selectedWeek}
          onToggleApprove={approval.toggleApprove}
          onSelectWeek={approval.selectWeek}
          subtitle={`수술자 · ${queryCategory} (수술일 기준)`}
          totalLabel="월 합계"
        />
      )}

      <Card className="min-h-0 flex-1 border-border/70 py-0 shadow-sm">
        <CardContent className="flex h-full min-h-0 flex-col px-0">
          {isError ? (
            <div className="flex flex-1 items-center justify-center px-3 text-sm text-red-500">데이터를 불러오지 못했습니다.</div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto rounded-t-lg border-b border-border/60">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-gray-50 text-[11px] text-gray-700">
                    {COLUMNS.map((col) => {
                      const activeDirection = sortState?.key === col.key ? sortState.direction : null
                      return (
                        <th
                          key={col.key}
                          aria-sort={activeDirection === 'asc' ? 'ascending' : activeDirection === 'desc' ? 'descending' : 'none'}
                          className={`sticky top-0 z-10 whitespace-nowrap border-b border-border/60 bg-gray-50 px-2.5 py-1.5 font-semibold ${ALIGN[col.align ?? 'left']}`}
                          style={{ minWidth: col.min }}
                        >
                          <button
                            type="button"
                            className={`inline-flex w-full items-center gap-1 text-[11px] font-semibold text-gray-800 transition-colors hover:text-blue-700 focus-visible:outline-none ${HEADER_ALIGN[col.align ?? 'left']}`}
                            onClick={() => handleSort(col.key)}
                          >
                            <span>{col.label}</span>
                            <span className="flex h-3.5 w-2.5 flex-col items-center justify-center gap-[1px]" aria-hidden="true">
                              <span className={`h-0 w-0 border-x-[3.5px] border-b-[4px] border-x-transparent ${activeDirection === 'asc' ? 'border-b-blue-600' : 'border-b-gray-300'}`} />
                              <span className={`h-0 w-0 border-x-[3.5px] border-t-[4px] border-x-transparent ${activeDirection === 'desc' ? 'border-t-blue-600' : 'border-t-gray-300'}`} />
                            </span>
                          </button>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {showSkeleton && Array.from({ length: Math.max(pageSize, SKELETON_ROWS) }, (_, rowIndex) => (
                    <tr key={`surgery-list-skeleton-${rowIndex}`} className="border-b border-border/40">
                      {COLUMNS.map((col) => (
                        <td key={col.key} className="whitespace-nowrap px-2.5 py-1" style={{ minWidth: col.min }}>
                          <span className="exam-skeleton-bar block h-2.5 w-full rounded" />
                        </td>
                      ))}
                    </tr>
                  ))}
                  {!showSkeleton && visibleRows.map((row, i) => {
                    const rowNumber = (safePage - 1) * pageSize + i + 1
                    return (
                      <tr key={`${row.surgeryDate}-${row.chartNo}-${row.surgeryCategory}-${i}`} className="border-b border-border/40 transition-colors hover:bg-blue-50/40">
                        {COLUMNS.map((col) => (
                          <td
                            key={col.key}
                            className={`whitespace-nowrap px-2.5 py-1 text-[11px] text-gray-800 ${ALIGN[col.align ?? 'left']}`}
                            style={{ minWidth: col.min }}
                          >
                            {col.render ? col.render(row, rowNumber) : dash(String(row[col.key as keyof SurgeryListItem] ?? ''))}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                  {!showSkeleton && tableRows.length === 0 && (
                    <tr>
                      <td colSpan={COLUMNS.length} className="px-3 py-12 text-center text-sm text-muted-foreground">
                        {hasSearched ? '검색 결과가 없습니다.' : '조회 조건을 선택한 뒤 조회 버튼을 눌러주세요.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 rounded-b-lg bg-white px-2 py-1.5 text-xs">
            <span className="min-w-[8rem] font-semibold text-gray-800" aria-live="polite">
              {formatCount(tableRows.length)}건 중 {formatCount(rangeStart)}-{formatCount(rangeEnd)}
            </span>
            <nav className="flex flex-1 items-center justify-center gap-1" aria-label="페이지 네비게이션">
              <Button type="button" variant="outline" size="sm" className="text-xs" disabled={safePage <= 1} onClick={() => handlePageChange(safePage - 1)}>
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
              <Button type="button" variant="outline" size="sm" className="text-xs" disabled={safePage >= pageMax} onClick={() => handlePageChange(safePage + 1)}>
                다음
              </Button>
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <label htmlFor="surgery-list-page-size" className="text-muted-foreground">행 수</label>
              <div className="relative">
                <select
                  id="surgery-list-page-size"
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
    </div>
  )
}
