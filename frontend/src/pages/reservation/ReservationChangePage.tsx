import { useMemo, useState } from 'react'
import { ChevronDown, Download, RotateCcw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useReservationChange } from '@/hooks/reservation/useReservationChange'
import { ReservationChangeDetailTable } from './reservation-change/ReservationChangeDetailTable'
import { downloadReservationChangeCsv } from './reservation-change/reservationChangeCsv'
import { buildViews, changeColumnCount, type ChangeFilters, type ChangeSort } from './reservation-change/reservationChangeModel'

/**
 * 예약 변경이력 — 검사예약(시력교정·드림렌즈·백내장)의 예약일이 언제, 어떻게 바뀌었는지.
 * 탭 ① 변경 상세(이 파일) · 탭 ② 추이 그래프(달력 형태로 예정 — 자리만 둔다).
 * 서버 조회는 등록 연도(또는 전체) 범위 하나. 나머지 필터는 [조회] 로 클라이언트에서 적용한다.
 */

const DATA_FROM_YEAR = 2022
const PAGE_SIZE_OPTIONS = [50, 100, 200]
const pad = (n: number) => String(n).padStart(2, '0')
const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const currentYear = () => String(new Date().getFullYear())
const yearOptions = () => Array.from({ length: Number(currentYear()) - DATA_FROM_YEAR + 1 }, (_, i) => String(DATA_FROM_YEAR + i))

interface Draft extends ChangeFilters { year: string }
const DEFAULT_DRAFT: Draft = { year: currentYear(), month: '', asOf: '', branch: '', state: '', minChanges: 1, sort: 'date', keyword: '' }

/** 조회 범위(등록일) — 연도 하나 또는 2022-01-01~오늘 */
const rangeOf = (year: string) => {
  const today = todayIso()
  if (!year) return { from: `${DATA_FROM_YEAR}-01-01`, to: today }
  const end = `${year}-12-31`
  return { from: `${year}-01-01`, to: end > today ? today : end }
}

const SELECT = 'h-8 appearance-none rounded-md border border-border/80 bg-white pl-2.5 pr-7 text-xs text-gray-700 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

function SelectBox<T extends string | number>({ label, value, options, onChange, width = 'w-[7.5rem]' }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (v: string) => void; width?: string
}) {
  return (
    <div className="relative">
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={`${SELECT} ${width}`}>
        {options.map((o) => <option key={String(o.value)} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
    </div>
  )
}

export function ReservationChangePage() {
  const [tab, setTab] = useState<'detail' | 'chart'>('detail')
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT)
  const [applied, setApplied] = useState<Draft>(DEFAULT_DRAFT)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(100)

  const { from, to } = useMemo(() => rangeOf(applied.year), [applied.year])
  const { rows, isLoading, isFetching, isError } = useReservationChange(from, to)
  const loading = isLoading || isFetching

  const views = useMemo(() => buildViews(rows, applied), [rows, applied])
  const maxChanges = useMemo(() => changeColumnCount(views), [views])
  const pageMax = Math.max(1, Math.ceil(views.length / pageSize))
  const safePage = Math.min(page, pageMax)
  const visible = useMemo(() => views.slice((safePage - 1) * pageSize, safePage * pageSize), [views, safePage, pageSize])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const apply = () => {
    // 기준일 조회는 기본 정렬을 '기준일 시점 예약일순' 으로 — 직접 다른 정렬을 골랐으면 그대로 둔다.
    const next = draft.asOf && draft.sort === 'date' ? { ...draft, sort: 'asof' as ChangeSort } : draft
    setDraft(next)
    setApplied(next)
    setPage(1)
  }
  const reset = () => { setDraft(DEFAULT_DRAFT); setApplied(DEFAULT_DRAFT); setPage(1) }
  const csv = () => downloadReservationChangeCsv(
    `예약변경이력_${applied.year || '전체'}${applied.month ? `-${applied.month}` : ''}.csv`, views, applied.asOf,
  )

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[32rem] flex-col gap-2 overflow-hidden text-xs text-gray-800">
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
          {([['detail', '변경 상세'], ['chart', '추이 그래프']] as const).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setTab(key)}
              className={`h-7 rounded-md px-3 text-xs font-semibold transition-colors ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
              {label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-gray-500">검사예약(시력교정·드림렌즈·백내장) 중 예약일이 1회 이상 바뀐 건 · 취소·미내원 포함 · 등록일 {DATA_FROM_YEAR}-01 ~</span>
      </div>

      {tab === 'chart' ? (
        <Card className="flex-1 border-border/70 shadow-sm">
          <CardContent className="flex h-full items-center justify-center text-sm text-muted-foreground">
            추이 그래프는 달력 형태로 준비 중입니다. 변경 상세 탭에서 목록과 CSV 를 이용해 주세요.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border/70 bg-white px-1.5 py-1 shadow-sm">
            <span className="pl-1 text-[11px] text-gray-500">등록기간</span>
            <SelectBox label="등록 연도" value={draft.year} width="w-[6.5rem]" onChange={(v) => set('year', v)}
              options={[{ value: '', label: '연도 전체' }, ...yearOptions().map((y) => ({ value: y, label: `${y}년` }))]} />
            <SelectBox label="등록 월" value={draft.month} width="w-[5.5rem]" onChange={(v) => set('month', v)}
              options={[{ value: '', label: '월 전체' }, ...Array.from({ length: 12 }, (_, i) => ({ value: pad(i + 1), label: `${i + 1}월` }))]} />
            <span className="mx-1 h-6 w-px bg-gray-200" />
            <span className="text-[11px] text-gray-500">기준일</span>
            <input type="date" aria-label="기준일" value={draft.asOf} min={`${DATA_FROM_YEAR}-01-01`} onChange={(e) => set('asOf', e.target.value)}
              className="h-8 rounded-md border border-border/80 bg-white px-2 text-xs text-gray-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            <span className="mx-1 h-6 w-px bg-gray-200" />
            <SelectBox label="구분" value={draft.branch} width="w-[6.5rem]" onChange={(v) => set('branch', v)}
              options={[{ value: '', label: '구분 전체' }, { value: 'M', label: '시력교정' }, { value: 'D', label: '드림렌즈' }, { value: 'H', label: '백내장' }]} />
            <SelectBox label="상태" value={draft.state} width="w-[7rem]" onChange={(v) => set('state', v)}
              options={[{ value: '', label: '상태 전체' }, { value: 'Y', label: '예약(미내원)' }, { value: 'I', label: '내원' }, { value: 'H', label: '퇴원' }, { value: 'C', label: '취소' }]} />
            <SelectBox label="변경횟수" value={draft.minChanges} width="w-[8.5rem]" onChange={(v) => set('minChanges', Number(v))}
              options={[{ value: 1, label: '변경 1회 이상' }, { value: 2, label: '2회 이상' }, { value: 3, label: '3회 이상' }, { value: 5, label: '5회 이상' }, { value: 0, label: '0회 포함 (기준일용)' }]} />
            <SelectBox label="정렬" value={draft.sort} width="w-[10rem]" onChange={(v) => set('sort', v as ChangeSort)}
              options={[{ value: 'date', label: '등록일순' }, { value: 'asof', label: '예약일순(기준일 시점)' }, { value: 'chg', label: '변경횟수순' }]} />
            <span className="mx-1 h-6 w-px bg-gray-200" />
            <input type="text" value={draft.keyword} onChange={(e) => set('keyword', e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') apply() }}
              placeholder="이름 · 차트번호 검색"
              className="h-8 w-[11rem] rounded-md border border-border/80 bg-white px-3 text-xs outline-none placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            <Button type="button" size="sm" disabled={loading} className="bg-blue-600 text-xs text-white hover:bg-blue-700" onClick={apply}><Search className="h-3.5 w-3.5" />조회</Button>
            <Button type="button" variant="outline" size="sm" className="text-xs" onClick={reset}><RotateCcw className="h-3.5 w-3.5" />초기화</Button>
            <Button type="button" size="sm" disabled={views.length === 0} className="bg-emerald-600 text-xs text-white hover:bg-emerald-700" onClick={csv} title="조회 결과 전체를 CSV 로 내려받기(변경별 일시 포함)"><Download className="h-3.5 w-3.5" />CSV</Button>
            <span className="ml-auto pr-1 tabular-nums text-gray-600" aria-live="polite">
              <strong className="text-gray-900">{views.length.toLocaleString('ko-KR')}건</strong> / 조회 범위 {rows.length.toLocaleString('ko-KR')}건
            </span>
          </div>

          <Card className="min-h-0 flex-1 border-border/70 py-0 shadow-sm">
            <CardContent className="flex h-full min-h-0 flex-col px-0">
              {isError ? (
                <div className="flex flex-1 items-center justify-center px-3 text-sm text-red-500">예약 변경이력을 불러오지 못했습니다.</div>
              ) : (
                <div className="min-h-0 flex-1 overflow-auto rounded-t-lg border-b border-border/60">
                  <ReservationChangeDetailTable views={visible} maxChanges={maxChanges} asOf={applied.asOf} loading={loading}
                    emptyText={rows.length === 0 ? '조회 범위에 변경된 예약이 없습니다. 마트 적재(예약 도메인 배치) 여부를 확인해 주세요.' : '조건에 맞는 예약이 없습니다.'} />
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 rounded-b-lg bg-white px-2 py-1.5 text-xs">
                <span className="min-w-[8rem] font-semibold text-gray-800">
                  {views.length.toLocaleString('ko-KR')}건 {views.length > 0 && `· ${((safePage - 1) * pageSize + 1).toLocaleString('ko-KR')}-${Math.min(safePage * pageSize, views.length).toLocaleString('ko-KR')}`}
                </span>
                <nav className="flex flex-1 items-center justify-center gap-1" aria-label="페이지 네비게이션">
                  <Button type="button" variant="outline" size="sm" className="text-xs" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>이전</Button>
                  <span className="px-2 tabular-nums text-gray-700">{safePage} / {pageMax}</span>
                  <Button type="button" variant="outline" size="sm" className="text-xs" disabled={safePage >= pageMax} onClick={() => setPage(safePage + 1)}>다음</Button>
                </nav>
                <div className="ml-auto flex items-center gap-2">
                  <label htmlFor="reservation-change-page-size" className="text-muted-foreground">행 수</label>
                  <div className="relative">
                    <select id="reservation-change-page-size" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }} className={`${SELECT} w-[4.5rem]`}>
                      {PAGE_SIZE_OPTIONS.map((o) => <option key={o} value={o}>{o}건</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
