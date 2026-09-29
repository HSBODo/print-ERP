import { useMemo, useState } from 'react'
import { Download, RotateCcw, Search } from 'lucide-react'
import { usePagination } from '#shared/hooks/usePagination'
import { Button } from '#shared/ui/Button'
import { Card, CardContent } from '#shared/ui/Card'
import { TablePagination } from '#shared/ui/TablePagination'
import { useReservationChange } from '../../../hooks/useReservationChange'
import { ReservationChangeDetailTable } from './ReservationChangeDetailTable'
import { downloadReservationChangeCsv } from '../utils/reservationChangeCsv'
import { buildViews, changeColumnCount, type ChangeFilters, type ChangeSort } from '../utils/reservationChangeModel'
import { SelectBox } from './FilterControls'

interface Draft extends ChangeFilters { year: string }

const DATA_FROM_YEAR = 2022
const pad = (n: number) => String(n).padStart(2, '0')
const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const currentYear = () => String(new Date().getFullYear())
const yearOptions = () => Array.from({ length: Number(currentYear()) - DATA_FROM_YEAR + 1 }, (_, i) => String(DATA_FROM_YEAR + i))

const DEFAULT_DRAFT: Draft = { year: currentYear(), month: '', asOf: '', branch: '', state: '', minChanges: 1, sort: 'date', keyword: '' }

/** 변경 상세 조회 범위(등록일) — 연도 하나 또는 2022-01-01~오늘. */
const rangeOf = (year: string) => {
  const today = todayIso()
  if (!year) return { from: `${DATA_FROM_YEAR}-01-01`, to: today }
  const end = `${year}-12-31`
  return { from: `${year}-01-01`, to: end > today ? today : end }
}

/**
 * 변경 상세 탭 — 등록 연도(또는 전체) 범위 하나를 서버에서 받고 나머지 필터·정렬은
 * 클라이언트 사이드로 적용해 [조회] 버튼 시점에 반영. 서버 라운드트립 최소화가 목적.
 */
export function DetailTab() {
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT)
  const [applied, setApplied] = useState<Draft>(DEFAULT_DRAFT)

  const { from, to } = useMemo(() => rangeOf(applied.year), [applied.year])
  const { rows, isLoading, isFetching, isError } = useReservationChange(from, to)
  const loading = isLoading || isFetching
  const views = useMemo(() => buildViews(rows, applied), [rows, applied])
  const maxChanges = useMemo(() => changeColumnCount(views), [views])
  const pagination = usePagination(views, { resetKey: [applied] })

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const apply = () => {
    // 기준일 조회는 기본 정렬을 '기준일 시점 예약일순' 으로 — 직접 다른 정렬을 골랐으면 그대로 둔다.
    const next = draft.asOf && draft.sort === 'date' ? { ...draft, sort: 'asof' as ChangeSort } : draft
    setDraft(next)
    setApplied(next)
  }
  const reset = () => { setDraft(DEFAULT_DRAFT); setApplied(DEFAULT_DRAFT) }
  const csv = () => downloadReservationChangeCsv(
    `예약변경이력_${applied.year || '전체'}${applied.month ? `-${applied.month}` : ''}.csv`, views, applied.asOf,
  )

  return (
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
              <ReservationChangeDetailTable views={pagination.pageRows} maxChanges={maxChanges} asOf={applied.asOf} loading={loading}
                emptyText={rows.length === 0 ? '조회 범위에 변경된 예약이 없습니다. 마트 적재(관리자 배치 · 예약 변경이력만) 여부를 확인해 주세요.' : '조건에 맞는 예약이 없습니다.'} />
            </div>
          )}
          <TablePagination pagination={pagination} className="rounded-b-lg" />
        </CardContent>
      </Card>
    </>
  )
}
