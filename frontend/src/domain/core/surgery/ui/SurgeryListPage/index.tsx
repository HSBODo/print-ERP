import { useMemo, useState } from 'react'
import { ChevronDown, Download, Repeat, RotateCcw, Search } from 'lucide-react'
import { DEFAULT_PAGE_SIZE, usePagination } from '#shared/hooks/usePagination'
import { Button } from '#shared/ui/Button'
import { TablePagination } from '#shared/ui/TablePagination'
import { MonthPicker } from '#shared/ui/MonthPicker'
import { Card, CardContent } from '#shared/ui/Card'
import { columnsToCsv, downloadCsv } from '#shared/utils/csv'
import { useSurgeryList } from '../../hooks/useSurgeryList'
import { useReoperationCandidates } from '../../hooks/useReoperationCandidates'
import { useReoperationDecisions } from '../../hooks/useReoperationDecisions'
import { ReoperationCandidatesModal } from './ReoperationCandidatesModal'
import type { SurgeryListItem } from '../../type/api'
import { COLUMNS, ALIGN, HEADER_ALIGN } from './surgeryListColumns'
import {
  dash,
  formatCount,
  CATEGORY_OPTIONS,
  SURGERY_TYPE_FILTERS,
  OPTION_FILTERS,
  CATARACT_FILTERS,
  REOP_FILTERS,
  matchesSurgeryType,
  matchesOption,
  matchesCataract,
  matchesReoperation,
  defaultFrom,
  defaultTo,
  SKELETON_ROWS,
  QUICK_RANGES,
  reopCandidateToRow,
  toMonthValue,
  toMonthStart,
  toMonthEnd,
  toMonthWeekRange,
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
  const [sortState, setSortState] = useState<SortState>(null)
  const [hasSearched, setHasSearched] = useState(false)
  // 수술 유형 필터 — 이미 조회된 rows 를 걸러내는 클라이언트 필터라 조회 버튼 없이 즉시 반영한다.
  const [typeFilter, setTypeFilter] = useState('전체')
  const [optionFilter, setOptionFilter] = useState('전체')
  const [cataractFilter, setCataractFilter] = useState('전체')
  const [reopFilter, setReopFilter] = useState('전체')
  const [reopOpen, setReopOpen] = useState(false)
  const [reopRange, setReopRange] = useState<{ from: string; to: string }>({ from: defaultFrom(), to: defaultTo() })

  const isReopTab = queryCategory === '재수술'
  const isAllTab = queryCategory === '전체'
  const isCataractTab = queryCategory === '백내장'
  const { rows, isLoading, isFetching, isError } = useSurgeryList(queryFrom, queryTo, hasSearched && !isReopTab)

  // 재수술은 RE_OPERATION 별도 테이블이라 수술자 리스트(OPERATIONDATA·Cataract_Operationdata)에 들어있지 않다.
  // 자동 포함분(레포트 반영분)만 리스트 행으로 변환하며, '재수술' 탭과 '전체' 탭에서 조회한다.
  const reopEnabled = hasSearched && (isReopTab || isAllTab)
  const { candidates: reopCandidates, isLoading: reopLoading, isFetching: reopFetching, isError: reopError } =
    useReoperationCandidates(queryFrom, queryTo, reopEnabled)
  // 저장된 재수술 판정 — 자동판정보다 우선. 저장 없음 = 자동판정 그대로.
  // 키는 (차트번호, 수술일, 우안, 좌안) — 같은 사람·같은 날 시술명이 다른 재수술을 별건으로 구분.
  const { decisions: reopDecisions } = useReoperationDecisions(queryFrom, queryTo, reopEnabled)
  const reopDecisionKey = (chartNo: string, opDate: string, againR: string, againL: string) =>
    `${chartNo}|${opDate}|${againR}|${againL}`
  const reopDecisionMap = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const d of reopDecisions) map.set(reopDecisionKey(d.chartNo, d.opDate, d.againR, d.againL), d.isReoperation)
    return map
  }, [reopDecisions])
  const reopRows = useMemo(
    () =>
      reopCandidates
        .filter(
          (c) =>
            reopDecisionMap.get(reopDecisionKey(c.chartNo, c.reopDate, c.againR, c.againL)) ??
            c.autoIncluded === 1,
        )
        .map(reopCandidateToRow),
    [reopCandidates, reopDecisionMap],
  )

  const activeError = isReopTab ? reopError : (isAllTab ? (isError || reopError) : isError)
  const showSkeleton = hasSearched && (
    isReopTab
      ? (reopLoading || reopFetching)
      : (isLoading || isFetching || (isAllTab && (reopLoading || reopFetching)))
  )

  const filtered = useMemo(() => {
    const q = queryKeyword.trim().toLowerCase()
    // 전체 = 시력교정 + 백내장 + 재수술. 월간 레포트 총수술과 동일한 가산 기준이라 조회건수가 레포트와 맞는다
    //   (2026-07: 726 + 43 + 29 = 798 = 레포트 총수술).
    // 같은 사람·같은 날이 수술자 리스트와 재수술에 함께 잡히는 건이 있으나(2026-07 6건, 렌즈 제거+삽입처럼
    // 한 세션이 두 테이블에 각각 기록된 경우) 레포트도 같은 방식으로 더하므로 여기서 걸러내지 않는다.
    const base = isReopTab
      ? reopRows
      : isAllTab
        ? [...rows, ...reopRows].sort((a, b) => a.surgeryDate.localeCompare(b.surgeryDate))
        : rows.filter((r) => r.surgeryCategory === queryCategory)
    // 화면에 안 보이는 필터는 적용하지 않는다 — 탭을 옮겼을 때 이전 선택이 몰래 걸러내는 걸 막는다.
    const vision = isAllTab || queryCategory === '시력교정'
    const cataract = isAllTab || queryCategory === '백내장'
    const reop = isAllTab || isReopTab
    const typed = base.filter((r) =>
      matchesSurgeryType(r, vision ? typeFilter : '전체')
      && matchesOption(r, vision ? optionFilter : '전체')
      && matchesCataract(r, cataract ? cataractFilter : '전체')
      && matchesReoperation(r, reop ? reopFilter : '전체'),
    )
    if (!q) return typed
    return typed.filter((r) => r.name.toLowerCase().includes(q) || r.chartNo.includes(q) || r.phone2.includes(q))
  }, [
    rows, reopRows, isReopTab, isAllTab, queryCategory, queryKeyword,
    typeFilter, optionFilter, cataractFilter, reopFilter,
  ])

  const tableRows = filtered

  // 선택한 구분에 해당하는 필터만 보여준다. '전체' 탭에서는 셋 다 노출.
  const showVisionFilters = isAllTab || queryCategory === '시력교정'
  const showCataractFilters = isAllTab || queryCategory === '백내장'
  const showReopFilters = isAllTab || isReopTab

  /**
   * 검사자 리스트와 같은 토글 스타일. 다만 한 줄에 담으려고 그룹 라벨을 빼고
   * 묶음 사이만 구분선으로 나눈다. 라벨이 없으니 aria-label 로 그룹을 알린다.
   */
  const filterGroup = (
    label: string,
    options: readonly string[],
    value: string,
    onChange: (v: string) => void,
    title?: string,
  ) => (
    <div
      role="group"
      aria-label={label}
      title={title ?? label}
      className="flex h-8 overflow-hidden rounded-md border border-border/80 bg-white"
    >
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          aria-pressed={value === opt}
          onClick={() => onChange(opt)}
          className={`border-l border-border/70 px-2.5 text-xs font-medium whitespace-nowrap transition-colors first:border-l-0 ${
            value === opt ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  )

  // 백내장 안(眼) 수 — 리스트는 사람·수술일(행) 단위(62), 레포트는 눈 단위(65: 같은날 양안=2안).
  // 행의 우/좌 수술값이 채워진 개수를 세면 레포트 기준 안 수와 일치. (백엔드 호출 불필요)
  const cataractEyeCount = useMemo(
    () => tableRows.reduce((sum, r) => sum + (r.surgeryR.trim() ? 1 : 0) + (r.surgeryL.trim() ? 1 : 0), 0),
    [tableRows],
  )

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

  const pagination = usePagination(sortedRows, {
    resetKey: [
      queryFrom, queryTo, queryCategory, queryKeyword,
      typeFilter, optionFilter, cataractFilter, reopFilter, sortState,
    ],
  })
  const visibleQuickRanges = draftPeriodMode === 'daily' ? QUICK_RANGES : []

  const handleSearch = () => {
    setHasSearched(true)
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
    setTypeFilter('전체')
    setOptionFilter('전체')
    setCataractFilter('전체')
    setReopFilter('전체')
    pagination.setPageSize(DEFAULT_PAGE_SIZE)
    setHasSearched(false)
  }

  // 현재 조회·필터·정렬 결과 전체(페이지 무관)를 CSV로 — 표에 보이는 칼럼/값 그대로.
  const handleDownloadCsv = () => {
    downloadCsv(`수술자리스트_${queryFrom}_${queryTo}.csv`, columnsToCsv(COLUMNS, sortedRows))
  }

  const handleSort = (key: string) => {
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

  // 재수술 검토 팝업 — 조회한 기간(미조회 시 선택 월) 기준. 툴바 카운트와 동일 범위라 값이 일치.
  const openReoperation = () => {
    if (hasSearched) {
      setReopRange({ from: queryFrom, to: queryTo })
    } else {
      const month = toMonthValue(draftFrom)
      setReopRange({ from: toMonthStart(month), to: toMonthEnd(month) })
    }
    setReopOpen(true)
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
            <MonthPicker
              ariaLabel="수술 기준 월"
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
              onClick={() => {
                setDraftCategory(category)
                // 카테고리는 클라이언트 필터(이미 조회된 rows 를 걸러냄)라 조회 버튼 없이 즉시 반영.
                if (hasSearched) setQueryCategory(category)
              }}
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
        <div
          className="flex h-8 items-center gap-2 rounded-md border border-border/80 bg-white px-3 text-xs"
          aria-live="polite"
          title={isAllTab
            ? '전체 = 시력교정 + 백내장 + 재수술. 월간 레포트 총수술과 같은 기준이다.'
            : '선택한 구분의 행 수(사람·수술일 기준).'}
        >
          <span className="text-muted-foreground">조회건수</span>
          <strong className="tabular-nums text-gray-900">{formatCount(tableRows.length)}건</strong>
        </div>
        {isCataractTab && hasSearched && (
          <div
            className="flex h-8 items-center gap-2 rounded-md border border-amber-200 bg-amber-50/60 px-3 text-xs"
            aria-live="polite"
            title="백내장 수술 안(眼) 수 — 같은 날 양안은 2안으로 셈. 월간 레포트 수술건수와 일치(조회건수는 사람·수술일 기준)."
          >
            <span className="text-amber-700">수술</span>
            <strong className="tabular-nums text-amber-900">{formatCount(cataractEyeCount)}안</strong>
          </div>
        )}
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
            className="bg-violet-600 text-xs text-white hover:bg-violet-700"
            onClick={openReoperation}
            title="재수술 검토 — 자동 집계 포함/제외를 확인·수정하고 저장 (저장 판정은 자동판정보다 우선)"
          >
            <Repeat className="h-3.5 w-3.5" />
            재수술 검토
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

      {/* 수술 유형 필터 — 수술별 비중 표와 같은 구성. 툴바 아래 한 줄. */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-md border border-border/60 bg-gray-50/70 px-2.5 py-2 text-xs shadow-sm">
        {showVisionFilters && filterGroup(
          '시력교정 유형', SURGERY_TYPE_FILTERS, typeFilter, setTypeFilter,
          '시력교정 수술 유형. ICL·T-ICL·KPL·T-KPL·VIVA 는 그 렌즈를 받은 사람을 고른다 — 수술별 비중 표는 환자당 대표유형(우안 우선) 하나만 세므로 건수가 다를 수 있다.',
        )}
        {showVisionFilters && <div className="h-5 w-px bg-border" />}
        {showVisionFilters && filterGroup('부가 옵션', OPTION_FILTERS, optionFilter, setOptionFilter, '부가 옵션 — 엑스트라(+X)·퍼스널(P.E)·콘트라(CONT)·웨이브비전(W.V)·모노비전(MONO)')}
        {showCataractFilters && <div className="h-5 w-px bg-border" />}
        {showCataractFilters && filterGroup('백내장 인공수정체', CATARACT_FILTERS, cataractFilter, setCataractFilter, '백내장 인공수정체 — 다초점·프리미엄(EDOF)·단초점')}
        {showReopFilters && <div className="h-5 w-px bg-border" />}
        {showReopFilters && filterGroup('재수술 구분', REOP_FILTERS, reopFilter, setReopFilter, '재수술 구분 — 레이저·렌즈')}
      </div>

      <Card className="min-h-0 flex-1 border-border/70 py-0 shadow-sm">
        <CardContent className="flex h-full min-h-0 flex-col px-0">
          {activeError ? (
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
                  {showSkeleton && Array.from({ length: Math.max(pagination.pageSize, SKELETON_ROWS) }, (_, rowIndex) => (
                    <tr key={`surgery-list-skeleton-${rowIndex}`} className="border-b border-border/40">
                      {COLUMNS.map((col) => (
                        <td key={col.key} className="whitespace-nowrap px-2.5 py-1" style={{ minWidth: col.min }}>
                          <span className="exam-skeleton-bar block h-2.5 w-full rounded" />
                        </td>
                      ))}
                    </tr>
                  ))}
                  {!showSkeleton && pagination.pageRows.map((row, i) => {
                    const rowNumber = pagination.rangeStart + i
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
          <TablePagination pagination={pagination} className="rounded-b-lg" />
        </CardContent>
      </Card>

      {reopOpen && (
        <ReoperationCandidatesModal
          from={reopRange.from}
          to={reopRange.to}
          onClose={() => setReopOpen(false)}
        />
      )}
    </div>
  )
}
