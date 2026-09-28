import { useMemo, useState } from 'react'
import { ChevronDown, Download, RotateCcw, Search } from 'lucide-react'
import { Button } from '#shared/ui/Button'
import { MonthPicker } from '#shared/ui/MonthPicker'
import { Card, CardContent } from '#shared/ui/Card'
import { columnsToCsv, downloadCsv } from '#shared/utils/csv'
import { useAllExamList } from '@/hooks/exam/useAllExamList'
import type { AllExamListItem } from '@/api/exam/allExamList'
import { COLUMNS, ALIGN, HEADER_ALIGN } from './allExamListColumns'
import {
  calcAge,
  compareSortValue,
  buildPaginationItems,
  formatCount,
  GROUP_FILTERS,
  matchesExamGroup,
  PAGE_SIZE_OPTIONS,
  QUICK_RANGES,
  previousMonthValue,
  toMonthValue,
  toMonthStart,
  toMonthEnd,
  toMonthWeekRange,
  type PeriodMode,
  type QuickRangeKey,
  type SortState,
} from './examListUtils'

// 기본 조회 기간 = 오늘 기준 전월 전체 (예: 7월이면 2026-06-01 ~ 2026-06-30)
const PREV_MONTH = previousMonthValue()
const DEFAULT_FROM = toMonthStart(PREV_MONTH)
const DEFAULT_TO = toMonthEnd(PREV_MONTH)

/**
 * 전체 검사자 리스트 — 시력교정(EXAM) + 백내장(Cataract_Exam) 통합 명단.
 * 모집단이 월별 검사자 종합지표와 동일해, 검사구분·내원동기·직업 토글의 조회건수가
 * 레포트 검사유입·검사수 수치와 정합한다. (상세 컬럼은 기존 개별 리스트 유지)
 */

const ONEDAY_FILTERS = ['전체', '원데이', '일반'] as const
const INTRO_FILTERS = ['전체', '일반', '고객소개', '직원소개'] as const
const JOB_FILTERS = ['전체', '직장인', '학생', '기타'] as const
const PATIENT_FILTERS = ['전체', '신환', '구환'] as const

const sortValue = (r: AllExamListItem, key: string, originalIndex: number): string | number => {
  if (key === 'rowNo') return originalIndex
  if (key === 'age') {
    const age = Number(calcAge(r.birth))
    return Number.isFinite(age) ? age : ''
  }
  return String((r as Record<string, unknown>)[key] ?? '').trim()
}

export function AllExamListPage() {
  const [draftPeriodMode, setDraftPeriodMode] = useState<PeriodMode>('daily')
  const [activeQuickRange, setActiveQuickRange] = useState<QuickRangeKey | null>(null)
  const [draftFrom, setDraftFrom] = useState(DEFAULT_FROM)
  const [draftTo, setDraftTo] = useState(DEFAULT_TO)
  const [queryFrom, setQueryFrom] = useState(DEFAULT_FROM)
  const [queryTo, setQueryTo] = useState(DEFAULT_TO)
  const [hasSearched, setHasSearched] = useState(false)

  const [examGroup, setExamGroup] = useState<string>('전체')
  const [oneDayFilter, setOneDayFilter] = useState<string>('전체')
  const [introType, setIntroType] = useState<string>('전체')
  const [jobBucket, setJobBucket] = useState<string>('전체')
  const [patientType, setPatientType] = useState<string>('전체')
  const [keyword, setKeyword] = useState('')

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [sortState, setSortState] = useState<SortState>(null)

  const { rows, isLoading, isFetching, isError } = useAllExamList(queryFrom, queryTo, hasSearched)
  const showLoading = hasSearched && (isLoading || isFetching)

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
      return r.name.toLowerCase().includes(q) || r.chartNo.includes(q) || r.phone2.includes(q)
    })
  }, [rows, examGroup, oneDayFilter, introType, jobBucket, patientType, keyword])

  const sorted = useMemo(() => {
    if (!sortState) return filtered
    const { key, direction } = sortState
    return filtered
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const compared = compareSortValue(sortValue(a.row, key, a.index), sortValue(b.row, key, b.index))
        if (compared !== 0) return direction === 'asc' ? compared : -compared
        return a.index - b.index
      })
      .map(({ row }) => row)
  }, [filtered, sortState])

  const pageMax = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(currentPage, pageMax)
  const paginationItems = useMemo(() => buildPaginationItems(safePage, pageMax), [safePage, pageMax])
  const visible = useMemo(
    () => sorted.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sorted, safePage, pageSize],
  )
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1
  const rangeEnd = Math.min(safePage * pageSize, filtered.length)

  const visibleQuickRanges = draftPeriodMode === 'daily' ? QUICK_RANGES : []

  const handleSearch = () => {
    setHasSearched(true)
    setQueryFrom(draftPeriodMode === 'monthly' ? toMonthStart(toMonthValue(draftFrom)) : draftFrom)
    setQueryTo(draftPeriodMode === 'monthly' ? toMonthEnd(toMonthValue(draftTo)) : draftTo)
    setCurrentPage(1)
  }

  const handlePeriodModeChange = (mode: PeriodMode) => {
    setDraftPeriodMode(mode)
    setActiveQuickRange(null)
    if (mode === 'monthly') {
      const month = toMonthValue(draftFrom)
      setDraftFrom(toMonthStart(month))
      setDraftTo(toMonthEnd(month))
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

  const handleReset = () => {
    setDraftPeriodMode('daily')
    setActiveQuickRange(null)
    setDraftFrom(DEFAULT_FROM)
    setDraftTo(DEFAULT_TO)
    setQueryFrom(DEFAULT_FROM)
    setQueryTo(DEFAULT_TO)
    setExamGroup('전체')
    setOneDayFilter('전체')
    setIntroType('전체')
    setJobBucket('전체')
    setPatientType('전체')
    setKeyword('')
    setCurrentPage(1)
    setPageSize(50)
    setSortState(null)
    setHasSearched(false)
  }

  const handleSort = (key: string) => {
    setCurrentPage(1)
    setSortState((prev) =>
      prev?.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )
  }

  const handleDownloadCsv = () => {
    downloadCsv(`전체검사자리스트_${queryFrom}_${queryTo}.csv`, columnsToCsv(COLUMNS, sorted))
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
      <div className="flex h-8 overflow-hidden rounded-md border border-border/80 bg-white">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            aria-pressed={value === opt}
            onClick={() => { onChange(opt); setCurrentPage(1) }}
            className={`min-w-[3rem] border-l border-border/70 px-2 text-xs font-medium transition-colors first:border-l-0 ${
              value === opt ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[32rem] flex-col gap-3 overflow-hidden text-xs text-gray-800">
      {/* 툴바: 기간 · 검색 · 조회건수 · 액션 */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-white px-1.5 py-1.5 text-xs shadow-sm">
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
            <MonthPicker
              ariaLabel="검사 기준 월"
              value={toMonthValue(draftFrom)}
              onChange={(v) => {
                setActiveQuickRange(null)
                setDraftFrom(toMonthStart(v))
                setDraftTo(toMonthEnd(v))
              }}
            />
          ) : (
            <>
              <input
                aria-label="검사 시작일"
                type="date"
                value={draftFrom}
                onChange={(e) => { setActiveQuickRange(null); setDraftFrom(e.target.value) }}
                className="h-8 w-[8.2rem] rounded-md border border-border/80 bg-white px-2 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <span className="text-gray-400">~</span>
              <input
                aria-label="검사 종료일"
                type="date"
                value={draftTo}
                onChange={(e) => { setActiveQuickRange(null); setDraftTo(e.target.value) }}
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
        <div className="flex h-8 overflow-hidden rounded-md border border-border/80 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="고객명 · 차트번호 · 연락처"
            className="h-full w-[12rem] border-0 bg-white px-3 text-xs outline-none placeholder:text-gray-400"
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
            disabled={isLoading}
            className="bg-blue-600 text-xs text-white hover:bg-blue-700"
            onClick={handleSearch}
          >
            <Search className="h-3.5 w-3.5" />
            조회
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!hasSearched || sorted.length === 0}
            className="bg-emerald-600 text-xs text-white hover:bg-emerald-700"
            onClick={handleDownloadCsv}
            title="조회 결과 전체를 CSV로 내려받기"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
        </div>
      </div>

      {/* 상세 필터 (토글) — 툴바 아래 한 줄 */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-border/60 bg-gray-50/70 px-2.5 py-2 text-xs shadow-sm">
        {filterGroup('검사', GROUP_FILTERS, examGroup, setExamGroup)}
        {filterGroup('원데이', ONEDAY_FILTERS, oneDayFilter, setOneDayFilter)}
        {filterGroup('동기', INTRO_FILTERS, introType, setIntroType)}
        {filterGroup('직업', JOB_FILTERS, jobBucket, setJobBucket)}
        {filterGroup('환자', PATIENT_FILTERS, patientType, setPatientType)}
      </div>

      {/* 상세 테이블 */}
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
                      const dir = sortState?.key === col.key ? sortState.direction : null
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
                            <span className="flex h-3.5 w-2.5 flex-col items-center justify-center gap-[1px]" aria-hidden="true">
                              <span className={`h-0 w-0 border-x-[3.5px] border-b-[4px] border-x-transparent ${dir === 'asc' ? 'border-b-blue-600' : 'border-b-gray-300'}`} />
                              <span className={`h-0 w-0 border-x-[3.5px] border-t-[4px] border-x-transparent ${dir === 'desc' ? 'border-t-blue-600' : 'border-t-gray-300'}`} />
                            </span>
                          </button>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {showLoading && (
                    <tr><td colSpan={COLUMNS.length} className="px-3 py-12 text-center text-sm text-muted-foreground">불러오는 중…</td></tr>
                  )}
                  {!showLoading && visible.map((row, i) => {
                    const rowNumber = (safePage - 1) * pageSize + i + 1
                    return (
                      <tr key={`${row.chartNo}-${row.examGroup}-${row.examDate}-${i}`} className="border-b border-border/40 transition-colors hover:bg-blue-50/40">
                        {COLUMNS.map((col) => (
                          <td key={col.key} className={`whitespace-nowrap px-2.5 py-1 text-[11px] text-gray-800 ${ALIGN[col.align ?? 'left']}`} style={{ minWidth: col.min }}>
                            {col.render ? col.render(row, rowNumber) : dashCell(row, col.key)}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                  {!showLoading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={COLUMNS.length} className="px-3 py-12 text-center text-sm text-muted-foreground">
                        {hasSearched ? '조회 결과가 없습니다.' : '기간을 선택한 뒤 조회 버튼을 눌러주세요.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          {/* 페이지네이션 */}
          <div className="flex flex-wrap items-center gap-2 rounded-b-lg bg-white px-2 py-1.5 text-xs">
            <span className="min-w-[8rem] font-semibold text-gray-800">
              {formatCount(filtered.length)}건 {filtered.length > 0 && `· ${formatCount(rangeStart)}-${formatCount(rangeEnd)}`}
            </span>
            <nav className="flex flex-1 items-center justify-center gap-1" aria-label="페이지 네비게이션">
              <Button type="button" variant="outline" size="sm" className="text-xs" disabled={safePage <= 1} onClick={() => setCurrentPage(safePage - 1)}>이전</Button>
              {paginationItems.map((item) =>
                typeof item === 'number' ? (
                  <Button key={item} type="button" variant={item === safePage ? 'default' : 'outline'} size="icon-sm" className="text-xs" onClick={() => setCurrentPage(item)}>{item}</Button>
                ) : (
                  <span key={item} className="px-1 text-muted-foreground">...</span>
                ),
              )}
              <Button type="button" variant="outline" size="sm" className="text-xs" disabled={safePage >= pageMax} onClick={() => setCurrentPage(safePage + 1)}>다음</Button>
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <label htmlFor="all-exam-page-size" className="text-muted-foreground">행 수</label>
              <div className="relative">
                <select
                  id="all-exam-page-size"
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
                  className="h-8 w-16 appearance-none rounded-md border border-border/80 bg-white pl-2.5 pr-7 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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

const dashCell = (row: AllExamListItem, key: string) => {
  const v = String((row as Record<string, unknown>)[key] ?? '')
  return v.trim() ? v : '—'
}
