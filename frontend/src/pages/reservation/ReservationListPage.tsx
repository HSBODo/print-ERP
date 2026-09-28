import { useMemo, useState } from 'react'
import { RotateCcw, Search, ChevronDown, ChevronUp, ChevronsUpDown, Download } from 'lucide-react'
import { Button } from '#shared/ui/Button'
import { MonthPicker } from '#shared/ui/MonthPicker'
import { Card, CardContent } from '#shared/ui/Card'
import { columnsToCsv, downloadCsv, type CsvColumn } from '#shared/utils/csv'
import { maskName } from '#shared/utils/mask'
import { useReservationList } from '@/hooks/reservation/useReservationList'
import type { ReservationListItem } from '@/api/reservation/reservationList'

/**
 * 예약자 리스트 — "예약 종합(콜·온라인)" 월간 건수를 구성하는 검사예약 인원 명단.
 * 등록일 기준 월 단위로 조회한다. 명단 합계 = 예약 종합 값(둘 다 카카오 미포함).
 */

/* ── 표시 헬퍼 ── */
// 값이 optional 인 컬럼(내원동기 중 등)도 그대로 넘길 수 있게 undefined 를 받는다.
const dash = (v: string | undefined) => (v && v.trim() ? v : '—')
const formatCount = (n: number) => n.toLocaleString('ko-KR')
/** 수술 수납액. 아직 수술 전이면 0 으로 오는데 '0원'으로 보이면 무료로 오해하므로 대시로 둔다. */
const formatPayment = (v?: number) => (v ? v.toLocaleString('ko-KR') : <span className="text-gray-300">—</span>)

const CHANNEL_STYLE: Record<string, string> = {
  인콜: 'bg-blue-50 text-blue-700',
  아웃콜: 'bg-sky-50 text-sky-700',
  홈페이지: 'bg-emerald-50 text-emerald-700',
  앱: 'bg-teal-50 text-teal-700',
  네이버: 'bg-green-50 text-green-700',
  카카오: 'bg-yellow-50 text-yellow-700',
}
const STATE_STYLE: Record<string, { label: string; className: string }> = {
  Y: { label: '예약', className: 'bg-blue-50 text-blue-700' },
  I: { label: '접수', className: 'bg-emerald-50 text-emerald-700' },
  H: { label: '퇴원', className: 'bg-gray-100 text-gray-600' },
  C: { label: '취소', className: 'bg-red-50 text-red-600' },
}

const Badge = ({ text, className }: { text: string; className?: string }) =>
  text ? (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[12px] font-medium ${className ?? 'bg-gray-100 text-gray-600'}`}>{text}</span>
  ) : (
    <span className="text-gray-300">—</span>
  )

/* ── 기간 헬퍼 ── */
const pad = (n: number) => String(n).padStart(2, '0')
const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const currentMonth = () => todayIso().slice(0, 7)

const monthRange = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const from = `${month}-01`
  let to = `${month}-${pad(lastDay)}`
  const today = todayIso()
  if (to > today) to = today // 진행 중인 월은 오늘(등록일)까지만
  return { from, to }
}

const CHANNELS = ['전체', '콜', '온라인'] as const
type Channel = (typeof CHANNELS)[number]
/** 콜/온라인 선택 시 나타나는 세부 채널(데이터의 channel 값과 일치) */
const SUB_CHANNELS: Record<Exclude<Channel, '전체'>, string[]> = {
  콜: ['인콜', '아웃콜'],
  온라인: ['홈페이지', '앱', '네이버', '카카오'], // 카카오는 해피톡 소스라 RESERVATION 미반영 → 보통 0건
}
const PAGE_SIZE_OPTIONS = [50, 100, 200]

/**
 * 상세 테이블 칼럼 — key가 있으면 헤더 클릭 정렬 가능('No'는 행 번호라 정렬 제외). 순서는 tbody 셀 순서와 일치.
 *
 * `tight` 는 값이 짧아 기본 여백(px-2.5)이 남아도는 칼럼 — 좌우를 좁혀 메모 칼럼에 폭을 넘긴다.
 * 지정하면 tbody 의 같은 순서 셀에도 `TIGHT_CELL` 을 함께 줘야 헤더와 본문 폭이 맞는다.
 */
type SortKey = keyof ReservationListItem
const COLUMNS: { label: string; key: SortKey | null; tight?: boolean }[] = [
  { label: 'No', key: null },
  { label: '예약등록일', key: 'registeredAt' },
  { label: '예약등록시간', key: 'registeredTime' },
  { label: '차트번호', key: 'chartNo', tight: true },
  { label: '고객명', key: 'name', tight: true },
  { label: '채널', key: 'channel', tight: true },
  { label: '내원동기(대)', key: 'motiveL' },
  { label: '내원동기(중)', key: 'motiveM' },
  { label: '상태', key: 'reserveState' },
  { label: '검사등록일', key: 'examRegDate' },
  { label: '검사중단', key: 'examStop' },
  { label: '수술등록일', key: 'surgeryRegDate' },
  { label: '수술명(우)', key: 'surgeryR' },
  { label: '수술명(좌)', key: 'surgeryL' },
  { label: '수술금액', key: 'surgeryPayment' },
  { label: '메모', key: 'comment' },
]

/**
 * CSV 출력 칼럼 — 표 칼럼/순서와 동일. 상태는 코드(Y/I/H/C) 대신 표시 라벨로.
 *
 * ⚠️ 개인정보는 CSV 로 나갈 때만 마스킹한다. 화면은 레거시와 동일하게 원문 유지 —
 * 파일은 PC 에 남고 메신저로 전달되므로 위험이 훨씬 크다.
 */
const CSV_COLUMNS: CsvColumn<ReservationListItem>[] = [
  { key: 'rowNo', label: 'No', csv: (_r, n) => n },
  { key: 'registeredAt', label: '예약등록일' },
  { key: 'registeredTime', label: '예약등록시간' },
  { key: 'chartNo', label: '차트번호', text: true },
  { key: 'name', label: '고객명', csv: (r) => maskName(r.name) },
  { key: 'channel', label: '채널' },
  { key: 'motiveL', label: '내원동기(대)' },
  { key: 'motiveM', label: '내원동기(중)' },
  { key: 'reserveState', label: '상태', csv: (r) => STATE_STYLE[r.reserveState.trim()]?.label ?? r.reserveState },
  { key: 'examRegDate', label: '검사등록일' },
  { key: 'examStop', label: '검사중단' },
  { key: 'surgeryRegDate', label: '수술등록일' },
  { key: 'surgeryR', label: '수술명(우)' },
  { key: 'surgeryL', label: '수술명(좌)' },
  // 금액은 숫자 그대로 내보낸다 — 엑셀에서 합계·평균을 바로 낼 수 있어야 한다.
  { key: 'surgeryPayment', label: '수술금액', csv: (r) => (r.surgeryPayment ? String(r.surgeryPayment) : '') },
  { key: 'comment', label: '메모' },
]

export function ReservationListPage() {
  const [draftMonth, setDraftMonth] = useState(currentMonth())
  const [draftKeyword, setDraftKeyword] = useState('')
  const [queryMonth, setQueryMonth] = useState(currentMonth())
  const [queryKeyword, setQueryKeyword] = useState('')
  const [channel, setChannel] = useState<Channel>('전체')
  const [subChannel, setSubChannel] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null)

  const { from, to } = useMemo(() => monthRange(queryMonth), [queryMonth])
  const { rows, isLoading, isFetching, isError } = useReservationList(from, to, hasSearched)
  const showLoading = hasSearched && (isLoading || isFetching)

  // 채널 + 세부채널 필터(즉시 반영)
  const channelFiltered = useMemo(() => {
    let base = channel === '전체' ? rows : rows.filter((r) => r.channelGroup === channel)
    if (subChannel) base = base.filter((r) => r.channel === subChannel)
    return base
  }, [rows, channel, subChannel])

  // 상세 테이블 (채널 + 키워드)
  const detail = useMemo(() => {
    const q = queryKeyword.trim().toLowerCase()
    if (!q) return channelFiltered
    return channelFiltered.filter((r) => r.name.toLowerCase().includes(q) || r.chartNo.includes(q))
  }, [channelFiltered, queryKeyword])

  // 정렬 (헤더 클릭) — 한글·숫자 자연 정렬. 필터 결과 길이는 그대로라 건수·페이지 표시는 불변.
  const sorted = useMemo(() => {
    if (!sort) return detail
    const { key, dir } = sort
    const factor = dir === 'asc' ? 1 : -1
    return [...detail].sort(
      (a, b) => String(a[key] ?? '').localeCompare(String(b[key] ?? ''), 'ko', { numeric: true }) * factor,
    )
  }, [detail, sort])

  const pageMax = Math.max(1, Math.ceil(detail.length / pageSize))
  const safePage = Math.min(page, pageMax)
  const visible = useMemo(
    () => sorted.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sorted, safePage, pageSize],
  )

  const handleSearch = () => {
    setHasSearched(true)
    setQueryMonth(draftMonth)
    setQueryKeyword(draftKeyword)
    setPage(1)
  }

  const handleReset = () => {
    setDraftMonth(currentMonth())
    setDraftKeyword('')
    setQueryMonth(currentMonth())
    setQueryKeyword('')
    setChannel('전체')
    setSubChannel(null)
    setPage(1)
    setPageSize(50)
    setSort(null)
    setHasSearched(false)
  }

  // 현재 조회·필터·정렬 결과 전체(페이지 무관)를 CSV로 — 표에 보이는 칼럼/값 그대로.
  const handleDownloadCsv = () => {
    downloadCsv(`예약자리스트_${queryMonth}.csv`, columnsToCsv(CSV_COLUMNS, sorted))
  }

  // 헤더 클릭: 오름차순 → 내림차순 → 해제 순환. 다른 칼럼 클릭 시 오름차순부터.
  const toggleSort = (key: SortKey) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' }
      return prev.dir === 'asc' ? { key, dir: 'desc' } : null
    })
    setPage(1)
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[32rem] flex-col gap-3 overflow-hidden text-xs text-gray-800">
      {/* 필터 바 */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border/70 bg-white px-1.5 py-1 text-xs shadow-sm">
        <MonthPicker ariaLabel="기준 월" value={draftMonth} onChange={setDraftMonth} defaultValue={currentMonth()} />
        <div className="flex h-8 overflow-hidden rounded-md border border-border/80 bg-white">
          {CHANNELS.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={channel === c}
              onClick={() => { setChannel(c); setSubChannel(null); setPage(1) }}
              className={`min-w-[3.5rem] border-l border-border/70 px-2 text-xs font-medium transition-colors first:border-l-0 ${
                channel === c ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        {channel !== '전체' && (
          <div className="flex h-8 items-center gap-1 rounded-md border border-blue-200 bg-blue-50/60 px-1">
            {['전체', ...SUB_CHANNELS[channel]].map((sc) => {
              const active = sc === '전체' ? subChannel === null : subChannel === sc
              return (
                <button
                  key={sc}
                  type="button"
                  aria-pressed={active}
                  onClick={() => { setSubChannel(sc === '전체' ? null : sc); setPage(1) }}
                  className={`h-6 rounded px-2 text-[11px] font-medium transition-colors ${
                    active ? 'bg-blue-600 text-white' : 'text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  {sc}
                </button>
              )
            })}
          </div>
        )}
        <div className="flex h-8 overflow-hidden rounded-md border border-border/80 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
          <input
            type="text"
            value={draftKeyword}
            onChange={(e) => setDraftKeyword(e.target.value)}
            placeholder="고객명 · 차트번호"
            className="h-full w-[13rem] border-0 bg-white px-3 text-xs outline-none placeholder:text-gray-400"
          />
        </div>
        <div className="flex h-8 items-center gap-2 rounded-md border border-border/80 bg-white px-3 text-xs" aria-live="polite">
          <span className="text-muted-foreground">조회건수</span>
          <strong className="tabular-nums text-gray-900">{formatCount(detail.length)}건</strong>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <Button type="button" variant="outline" size="sm" className="text-xs" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" />
            초기화
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={showLoading}
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

      {/* 상세 테이블 */}
      <Card className="min-h-0 flex-1 border-border/70 py-0 shadow-sm">
        <CardContent className="flex h-full min-h-0 flex-col px-0">
          {isError ? (
            <div className="flex flex-1 items-center justify-center px-3 text-sm text-red-500">데이터를 불러오지 못했습니다.</div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto rounded-t-lg border-b border-border/60">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="bg-gray-50 text-[12px] text-gray-700">
                    {COLUMNS.map((col) => {
                      const active = col.key !== null && sort?.key === col.key
                      return (
                        <th
                          key={col.label}
                          className={`sticky top-0 z-10 whitespace-nowrap border-b border-border/60 bg-gray-50 py-1.5 text-center font-semibold ${col.tight ? 'px-1' : 'px-2.5'}`}
                        >
                          {col.key ? (
                            <button
                              type="button"
                              onClick={() => toggleSort(col.key as SortKey)}
                              className={`inline-flex w-full items-center justify-center gap-1 transition-colors hover:text-blue-700 ${active ? 'text-blue-700' : ''}`}
                              title="클릭하여 정렬 (오름차순 → 내림차순 → 해제)"
                            >
                              <span>{col.label}</span>
                              {active ? (
                                sort?.dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                              ) : (
                                <ChevronsUpDown className="h-3 w-3 text-gray-300" />
                              )}
                            </button>
                          ) : (
                            col.label
                          )}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {showLoading && (
                    <tr><td colSpan={15} className="px-3 py-12 text-center text-sm text-muted-foreground">불러오는 중…</td></tr>
                  )}
                  {!showLoading && visible.map((r: ReservationListItem, i) => {
                    const st = STATE_STYLE[r.reserveState.trim()]
                    return (
                      <tr key={`${r.chartNo}-${r.registeredAt}-${r.registeredTime}-${i}`} className="border-b border-border/40 transition-colors hover:bg-blue-50/40">
                        <td className="whitespace-nowrap px-2.5 py-1 text-right tabular-nums text-gray-500">{formatCount((safePage - 1) * pageSize + i + 1)}</td>
                        <td className="whitespace-nowrap px-2.5 py-1 text-center">{dash(r.registeredAt)}</td>
                        <td className="whitespace-nowrap px-2.5 py-1 text-center tabular-nums text-gray-600">{dash(r.registeredTime)}</td>
                        {/* 아래 3칸은 COLUMNS 의 tight 칼럼 — 헤더와 같은 px-1 을 써야 폭이 맞는다. */}
                        <td className="whitespace-nowrap px-1 py-1 text-center">{dash(r.chartNo)}</td>
                        <td className="whitespace-nowrap px-1 py-1 text-center font-medium text-gray-900">{dash(r.name)}</td>
                        <td className="whitespace-nowrap px-1 py-1 text-center"><Badge text={r.channel} className={CHANNEL_STYLE[r.channel]} /></td>
                        {/* 내원동기 대/중 — 같은 출처의 짝이라 메모 추출분(amber)·TM 배정 DB 확인분(sky)은 둘 다 색으로 구분. */}
                        <td
                          className={`whitespace-nowrap px-2.5 py-1 text-center ${
                            r.motiveMSource === 'MEMO' ? 'text-amber-700'
                              : r.motiveMSource === 'TMDB' ? 'text-sky-700'
                              : 'text-gray-700'
                          }`}
                        >
                          {dash(r.motiveL)}
                        </td>
                        {/* CRM 등록값이 아닌 출처는 색 + 마커로 구분한다 — 섞어 세면 안 된다. */}
                        <td
                          className={`whitespace-nowrap px-2.5 py-1 text-center ${
                            r.motiveMSource === 'MEMO' ? 'text-amber-700'
                              : r.motiveMSource === 'TMDB' ? 'text-sky-700'
                              : 'text-gray-700'
                          }`}
                          title={r.motiveMSource === 'MEMO'
                            ? 'CRM 내원동기가 비어 있어 메모의 TM고객(대/중) 문구에서 가져온 값입니다.'
                            : r.motiveMSource === 'TMDB'
                              ? '텔레매니저 TM 배정 DB(모두닥 이벤트 리드)에서 확인된 유입입니다. CRM 내원동기보다 우선합니다.'
                              : undefined}
                        >
                          {dash(r.motiveM)}
                          {r.motiveMSource === 'MEMO' && <span className="ml-0.5 text-[10px]">*</span>}
                          {r.motiveMSource === 'TMDB' && <span className="ml-0.5 text-[10px]">†</span>}
                        </td>
                        <td className="whitespace-nowrap px-2.5 py-1 text-center"><Badge text={st?.label ?? r.reserveState} className={st?.className} /></td>
                        <td className="whitespace-nowrap px-2.5 py-1 text-center text-gray-600">{dash(r.examRegDate)}</td>
                        <td className="whitespace-nowrap px-2.5 py-1 text-center">
                          {r.examStop === 'Y'
                            ? <span className="rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-600">Y</span>
                            : r.examStop === 'N'
                              ? <span className="text-gray-500">N</span>
                              : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="whitespace-nowrap px-2.5 py-1 text-center text-gray-600">{dash(r.surgeryRegDate)}</td>
                        {/* 수술명 우/좌 — 수술자 리스트와 같은 원천이라 표기가 그대로 일치한다. */}
                        <td className="whitespace-nowrap px-2.5 py-1 text-center text-gray-700">{dash(r.surgeryR)}</td>
                        <td className="whitespace-nowrap px-2.5 py-1 text-center text-gray-700">{dash(r.surgeryL)}</td>
                        <td className="whitespace-nowrap px-2.5 py-1 text-right tabular-nums text-gray-800">{formatPayment(r.surgeryPayment)}</td>
                        <td className="w-full max-w-0 px-2.5 py-1 text-left">
                          <span className="block truncate text-gray-700" title={r.comment}>{dash(r.comment)}</span>
                        </td>
                      </tr>
                    )
                  })}
                  {!showLoading && detail.length === 0 && (
                    <tr>
                      <td colSpan={15} className="px-3 py-12 text-center text-sm text-muted-foreground">
                        {hasSearched ? '조회 결과가 없습니다.' : '기준 월을 선택한 뒤 조회 버튼을 눌러주세요.'}
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
              {formatCount(detail.length)}건 {detail.length > 0 && `· ${formatCount((safePage - 1) * pageSize + 1)}-${formatCount(Math.min(safePage * pageSize, detail.length))}`}
            </span>
            <nav className="flex flex-1 items-center justify-center gap-1" aria-label="페이지 네비게이션">
              <Button type="button" variant="outline" size="sm" className="text-xs" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>이전</Button>
              <span className="px-2 tabular-nums text-gray-700">{safePage} / {pageMax}</span>
              <Button type="button" variant="outline" size="sm" className="text-xs" disabled={safePage >= pageMax} onClick={() => setPage(safePage + 1)}>다음</Button>
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <label htmlFor="reservation-page-size" className="text-muted-foreground">행 수</label>
              <div className="relative">
                <select
                  id="reservation-page-size"
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
                  className="h-8 w-[4.5rem] appearance-none rounded-md border border-border/80 bg-white pl-2.5 pr-7 text-xs outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}건</option>
                  ))}
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
