import { useMemo, useState } from 'react'
import { ChevronDown, Download, Radio, RotateCcw, Search, TriangleAlert } from 'lucide-react'
import { usePagination } from '#shared/hooks/usePagination'
import { Button } from '#shared/ui/Button'
import { TablePagination } from '#shared/ui/TablePagination'
import { MonthPicker } from '#shared/ui/MonthPicker'
import { Card, CardContent } from '#shared/ui/Card'
import { columnsToCsv, downloadCsv } from '#shared/utils/csv'
import { useReservationListHomepage } from '../../hooks/useReservationListHomepage'
import { COLUMNS, ALIGN, HEADER_ALIGN, csvColumnsOf } from './reservationListHomepageColumns'
import {
  formatCount,
  isRangeBeyondSnapshot,
  matchesSearch,
  getSortValue,
  compareSortValue,
  defaultFrom,
  defaultTo,
  DEVICE_FILTER_OPTIONS,
  RESERVE_FILTER_OPTIONS,
  SKELETON_ROWS,
  toMonthValue,
  toMonthStart,
  toMonthEnd,
  type PeriodMode,
  type SortState,
} from './reservationListHomepageUtils'

/** 레거시 nPageSize 기본값(20)에 가장 가까운 공통 선택지. */
const INITIAL_PAGE_SIZE = 25

/**
 * 예약자 리스트_홈페이지 — 레거시 관리자 화면 `counsel/online_list.php`(SCR-39) 재현.
 *
 * 소스: 레거시 TBL_COUNSEL 의 CATEGORY='COUNSELONLINE' 단일 테이블(조인 없음).
 * 데이터: useReservationListHomepage(from,to) → GET /api/reservation-list-homepage
 *
 * 레거시 원본 동작을 따르는 지점:
 *  - 등록일(REG_DATE) 기준 조회다. 예약일이 아니다.
 *  - No 는 표시용 행번호이고 총건수에서 1씩 감소한다(저장값 아님, 정렬 바꾸면 달라짐).
 *    식별자는 legacyNo(C_NO).
 *  - 삭제건(DEL_TF<>'N')은 조회 대상이 아니다(레거시 PHP 하드코딩).
 * 레거시와 의도적으로 다른 지점:
 *  - 조회 전용 화면이라 체크박스·삭제 버튼(쓰기 액션)은 두지 않는다.
 *    CSV 내보내기는 읽기 액션이라 다른 리스트 화면과 동일하게 제공한다.
 *  - 휴대폰번호로도 검색된다(레거시는 이름·ID만 가능해 운영 불편이 있었다).
 *  - 필터는 레거시의 4블록 폼 대신 다른 리스트 화면과 같은 단일 행 툴바로 그린다.
 */
export function ReservationListHomepagePage() {
  // 등록일만 서버 조회 파라미터다 — draft(입력중) / query(조회에 반영됨)를 나눈다.
  const [draftPeriodMode, setDraftPeriodMode] = useState<PeriodMode>('daily')
  const [draftFrom, setDraftFrom] = useState(defaultFrom)
  const [draftTo, setDraftTo] = useState(defaultTo)
  const [queryFrom, setQueryFrom] = useState(defaultFrom)
  const [queryTo, setQueryTo] = useState(defaultTo)
  // 구분·예약구분·검색은 이미 받아온 행을 거르는 클라이언트 필터라 즉시 적용한다.
  // (조회 버튼을 기다리게 하면 눌러도 아무 일이 없는 것처럼 보인다 — 서버 왕복이 필요 없다)
  const [device, setDevice] = useState('전체')
  const [reserve, setReserve] = useState('전체')
  const [keyword, setKeyword] = useState('')
  const [sortState, setSortState] = useState<SortState>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const { rows, lastRegDate, live, isLoading, isFetching, isError } =
    useReservationListHomepage(queryFrom, queryTo, hasSearched)
  const showSkeleton = hasSearched && (isLoading || isFetching)

  const sourceReady = hasSearched && !showSkeleton && !isError
  // 조회 구간이 스냅샷 범위를 넘으면 건수가 조용히 모자라게 나온다 — 명시적으로 경고.
  // 실시간 소스에는 이 천장이 없다. 그때 같은 비교를 하면 미래 날짜 조회마다 거짓 경고가 뜬다.
  const beyondSnapshot =
    sourceReady && !live && isRangeBeyondSnapshot(queryTo, lastRegDate)
  // 실시간이면 경고 대신 신선도를 알린다 — 안 그러면 소스 시점을 알 길이 없어진다.
  const showLiveNote = sourceReady && live && Boolean(lastRegDate)

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (device !== '전체' && r.deviceType.trim() !== device) return false
      if (reserve !== '전체' && r.isReserve.trim() !== reserve) return false
      return matchesSearch(r, keyword)
    })
  }, [rows, device, reserve, keyword])

  const sortedRows = useMemo(() => {
    if (!sortState) return filtered

    return filtered
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
  }, [filtered, sortState])

  const pagination = usePagination(sortedRows, {
    initialPageSize: INITIAL_PAGE_SIZE,
    resetKey: [queryFrom, queryTo, device, reserve, keyword, sortState],
  })

  /** 조회 = 등록일 구간 재조회(서버). 나머지 필터는 이미 즉시 반영돼 있다. */
  const handleSearch = () => {
    setHasSearched(true)
    setQueryFrom(draftFrom)
    setQueryTo(draftTo)
  }

  /**
   * 일별 ↔ 월별 전환. 월별은 단일 월이므로 from·to 를 그 달의 시작·끝으로 맞춘다.
   * (진행 중인 달이면 toMonthEnd 가 오늘까지만 자른다 — 미래 조회는 의미가 없다)
   */
  const handlePeriodModeChange = (mode: PeriodMode) => {
    setDraftPeriodMode(mode)
    if (mode === 'monthly') {
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
    setDevice('전체')
    setReserve('전체')
    setKeyword('')
    pagination.setPageSize(INITIAL_PAGE_SIZE)
    setSortState(null)
    setHasSearched(false)
  }

  // 현재 조회·필터·정렬 결과 전체(페이지 무관)를 CSV로 — 표에 보이는 칼럼/값 그대로.
  const handleDownloadCsv = () => {
    downloadCsv(
      `예약자리스트_홈페이지_${queryFrom}_${queryTo}.csv`,
      columnsToCsv(csvColumnsOf(sortedRows.length), sortedRows),
    )
  }

  const handleSort = (key: string) => {
    setSortState((prev) =>
      prev?.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[32rem] flex-col gap-3 overflow-hidden text-xs text-gray-800">
      {/* 필터 바 — 다른 리스트 화면(검사자·수술자·예약자)과 동일한 단일 행 툴바 구성 */}
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
              ariaLabel="등록 기준 월"
              value={toMonthValue(draftFrom)}
              max={toMonthValue(defaultTo())}
              onChange={(v) => {
                setDraftFrom(toMonthStart(v))
                setDraftTo(toMonthEnd(v))
              }}
            />
          ) : (
            <>
              <input
                aria-label="등록 시작일"
                type="date"
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
                className="h-8 w-[8.2rem] rounded-md border border-border/80 bg-white px-2 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <span className="text-gray-400">~</span>
              <input
                aria-label="등록 종료일"
                type="date"
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
                className="h-8 w-[8.2rem] rounded-md border border-border/80 bg-white px-2 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </>
          )}
        </div>
        <div className="h-6 w-px bg-border" />
        <div className="flex h-8 overflow-hidden rounded-md border border-border/80 bg-white">
          {DEVICE_FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={device === option.value}
              className={`min-w-[3.5rem] border-l border-border/70 px-2 text-xs font-medium transition-colors first:border-l-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-100 ${
                device === option.value
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-950'
              }`}
              onClick={() => setDevice(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <select
            aria-label="예약구분"
            value={reserve}
            onChange={(e) => setReserve(e.target.value)}
            className="h-8 w-32 appearance-none rounded-md border border-border/80 bg-white pl-2.5 pr-8 text-xs outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            {RESERVE_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value === '전체' ? '예약구분 전체' : option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
        </div>
        <div className="flex h-8 overflow-hidden rounded-md border border-border/80 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="이름 · 휴대폰번호"
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

      {beyondSnapshot && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>
            홈페이지 예약 데이터는 매일 새벽 배치로 반영됩니다.
            마지막 반영: <strong className="tabular-nums">{lastRegDate}</strong> — 이후 등록건은 다음 배치까지 표시되지 않습니다.
          </span>
        </div>
      )}

      {showLiveNote && (
        <div className="flex items-start gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">
          <Radio className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>실시간</strong> — 레거시 홈페이지 운영 DB 를 직접 조회합니다.
            마지막 등록건: <strong className="tabular-nums">{lastRegDate}</strong>
          </span>
        </div>
      )}

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
                      const activeDirection = sortState?.key === col.key ? sortState.direction : null

                      return (
                        <th
                          key={col.key}
                          aria-sort={
                            activeDirection === 'asc' ? 'ascending'
                              : activeDirection === 'desc' ? 'descending'
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
                            <span className="flex h-3.5 w-2.5 flex-col items-center justify-center gap-[1px]" aria-hidden="true">
                              <span
                                className={`h-0 w-0 border-x-[3.5px] border-b-[4px] border-x-transparent ${
                                  activeDirection === 'asc' ? 'border-b-blue-600' : 'border-b-gray-300'
                                }`}
                              />
                              <span
                                className={`h-0 w-0 border-x-[3.5px] border-t-[4px] border-x-transparent ${
                                  activeDirection === 'desc' ? 'border-t-blue-600' : 'border-t-gray-300'
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
                  {showSkeleton && Array.from({ length: Math.max(pagination.pageSize, SKELETON_ROWS) }, (_, rowIndex) => (
                    <tr key={`reservation-list-homepage-skeleton-${rowIndex}`} className="border-b border-border/40">
                      {COLUMNS.map((col) => (
                        <td key={col.key} className="whitespace-nowrap px-2.5 py-1" style={{ minWidth: col.min }}>
                          <span className="exam-skeleton-bar block h-2.5 w-full rounded" />
                        </td>
                      ))}
                    </tr>
                  ))}
                  {!showSkeleton && pagination.pageRows.map((row, i) => {
                    // 레거시 재현 — No 는 총건수에서 1씩 감소하는 표시용 번호다.
                    const rowNumber = filtered.length - (pagination.rangeStart - 1 + i)

                    return (
                      <tr key={row.legacyNo} className="border-b border-border/40 transition-colors hover:bg-blue-50/40">
                        {COLUMNS.map((col) => (
                          <td
                            key={col.key}
                            className={`px-2.5 py-1 text-[11px] text-gray-800 ${ALIGN[col.align ?? 'left']}`}
                            style={{ minWidth: col.min }}
                          >
                            {col.render?.(row, rowNumber)}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                  {!showSkeleton && filtered.length === 0 && (
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
    </div>
  )
}
