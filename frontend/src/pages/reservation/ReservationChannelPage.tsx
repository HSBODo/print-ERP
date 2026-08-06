import { useMemo, useState } from 'react'
import { RotateCcw, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PanelShell } from '@/components/PanelShell'
import { useReservationChannel } from '@/hooks/reservation/useReservationChannel'
import { useSurgeryTrend } from '@/hooks/surgery/useSurgeryTrend'
import { CURRENT_YEAR } from '@/constants/chart'
import type { ReservationChannelFunnelItem } from '@/api/reservation/reservationChannel'

/**
 * 예약통계_채널별 — 예약자 리스트를 채널로 묶어 단계별로 좁혀 보는 화면.
 *
 * 단계는 예약자 리스트에서 차례로 걸러낸 것이라 합계가 항상 리스트와 맞는다.
 *   예약 → 취소 제외 → 접수(내원) → 검사 → 수술등록
 *
 * 채널 판정은 v_reservation_channel 이 한다(내원동기 매체명 > 직원 설정표 > 예약경로).
 * 화면은 판정을 하지 않는다 — 규칙을 바꾸려면 뷰만 고치면 된다.
 */

/* ── 단계 정의 ── 순서가 곧 퍼널 순서다.
 * personKey/totalKey 는 같은 단계의 사람수. 건수와 세는 단위가 다르다 —
 * 건수는 채널이 몇 번 일했나, 사람수는 실제 몇 명이 왔나. */
type StageKey = keyof Pick<ReservationChannelFunnelItem, 'reserved' | 'notCancel' | 'visited' | 'examined' | 'surgery'>
type PersonKey = keyof Pick<ReservationChannelFunnelItem,
  'reservedPersons' | 'notCancelPersons' | 'visitedPersons' | 'examinedPersons' | 'surgeryPersons'>
type TotalKey = keyof Pick<ReservationChannelFunnelItem,
  'totalReservedPersons' | 'totalNotCancelPersons' | 'totalVisitedPersons' | 'totalExaminedPersons' | 'totalSurgeryPersons'>

const STAGES: { key: StageKey; personKey: PersonKey; totalKey: TotalKey; label: string; hint: string; color: string }[] = [
  { key: 'reserved',  personKey: 'reservedPersons',  totalKey: 'totalReservedPersons',  label: '예약',     hint: '등록일 기준 전체 예약 건', color: '#1e3a8a' },
  { key: 'notCancel', personKey: 'notCancelPersons', totalKey: 'totalNotCancelPersons', label: '취소 제외', hint: '예약 상태가 취소(C)가 아닌 건', color: '#2563eb' },
  { key: 'visited',   personKey: 'visitedPersons',   totalKey: 'totalVisitedPersons',   label: '접수',     hint: '미내원(Y)까지 뺀, 실제 내원한 건', color: '#0ea5e9' },
  { key: 'examined',  personKey: 'examinedPersons',  totalKey: 'totalExaminedPersons',  label: '검사',     hint: '검사등록일이 있는 건', color: '#10b981' },
  { key: 'surgery',   personKey: 'surgeryPersons',   totalKey: 'totalSurgeryPersons',   label: '수술등록',  hint: '수술예약을 등록한 건 — 수술한 날이 아니다', color: '#f59e0b' },
]

/** 수술 유형 — 비중은 하드코딩하지 않고 수술 통계 API 에서 그 해 누적으로 가져온다.
 *  수술 정의가 바뀌면(오늘 KPL·PIOL 처럼) 이 화면도 자동으로 따라온다. */
const TYPE_DEFS: { key: string; name: string; color: string }[] = [
  { key: 'smilePro',   name: '스마일프로',       color: '#F58A93' },
  { key: 'smile',      name: '스마일',           color: '#ED0F8C' },
  { key: 'lasek',      name: '라섹',             color: '#2C7BE5' },
  { key: 'tIcl',       name: 'T-ICL',            color: '#F5A623' },
  { key: 'icl',        name: 'ICL',              color: '#F26522' },
  { key: 'lasik',      name: '라식',             color: '#3B82F6' },
  { key: 'catMulti',   name: '백내장(다초점)',   color: '#F97316' },
  { key: 'catEdof',    name: '백내장(연속초점)', color: '#EF4444' },
  { key: 'tKpl',       name: 'T-KPL',            color: '#2DD4A7' },
  { key: 'kpl',        name: 'KPL',              color: '#10B981' },
  { key: 'catMono',    name: '백내장(단초점)',   color: '#64748B' },
  { key: 'presbyond',  name: '프레스비욘드',     color: '#8B5CF6' },
  { key: 'viva',       name: 'VIVA',             color: '#6366F1' },
]

/* ── 기간 헬퍼 (예약자 리스트와 같은 규칙: 진행 중인 달은 오늘까지) ── */
const pad = (n: number) => String(n).padStart(2, '0')
const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const currentMonth = () => todayIso().slice(0, 7)
const monthRange = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  const from = `${month}-01`
  let to = `${month}-${pad(new Date(y, m, 0).getDate())}`
  const today = todayIso()
  if (to > today) to = today
  return { from, to }
}
/** 전월 대비용 — 이전 달 */
const prevMonthOf = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

const nf = (n: number) => n.toLocaleString('ko-KR')
/** 소수 1자리. 딱 떨어지면 정수로 — 숫자가 많은 화면이라 자릿수를 줄인다. */
const pct = (num: number, den: number) => {
  if (!den) return '—'
  const v = (num * 100) / den
  return `${Number.isInteger(v) ? v : v.toFixed(1)}%`
}

/* ── 퍼널 SVG 좌표계 ──
 * 밴드를 세로 중앙 정렬해 좁아지는 흐름이 바로 보이게 한다.
 * 높이는 1단계(예약) 대비 비율이라, 채널을 바꿔도 그 채널 안에서의 잔존율을 나타낸다. */
const VB_W = 1200
const VB_H = 280
const CY = VB_H / 2
const BAND_W = VB_W / STAGES.length
const MAX_H = 232

type SortKey = 'default' | 'volume' | 'rate'
type BarMode = 'abs' | 'rate'

export function ReservationChannelPage() {
  const [draftMonth, setDraftMonth] = useState(currentMonth())
  const [queryMonth, setQueryMonth] = useState(currentMonth())
  const [sort, setSort] = useState<SortKey>('default')
  const [mode, setMode] = useState<BarMode>('abs')
  const [sel, setSel] = useState<string | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  // 기본 열림 — 정보를 먼저 보여주고, 필요 없으면 ✕ 로 닫게 한다.
  const [typeOpen, setTypeOpen] = useState(true)

  const { from, to } = useMemo(() => monthRange(queryMonth), [queryMonth])
  const { rows, isLoading, isFetching, isError } = useReservationChannel(from, to)
  // 전월 대비는 추정하지 않고 이전 달을 실제로 조회해 계산한다.
  const prev = useMemo(() => monthRange(prevMonthOf(queryMonth)), [queryMonth])
  const { rows: prevRows } = useReservationChannel(prev.from, prev.to)
  const loading = isLoading || isFetching

  const prevFinalByChannel = useMemo(() => {
    const map: Record<string, number> = {}
    prevRows.forEach((r) => { if (r.reserved) map[r.channel] = (r.surgery * 100) / r.reserved })
    return map
  }, [prevRows])

  /** 건수 합계는 채널을 더하면 되지만, 사람수는 더하면 안 된다 —
   *  한 사람이 두 채널로 예약하면 채널마다 1명씩 세어져 중복된다. 서버가 준 전체값을 쓴다. */
  const total = useMemo(
    () => STAGES.reduce((acc, s) => ({ ...acc, [s.key]: rows.reduce((sum, r) => sum + r[s.key], 0) }), {} as Record<StageKey, number>),
    [rows],
  )
  const totalPersons = useMemo(
    () => STAGES.reduce((acc, s) => ({ ...acc, [s.key]: rows[0]?.[s.totalKey] ?? 0 }), {} as Record<StageKey, number>),
    [rows],
  )

  const selRow = sel ? rows.find((r) => r.channel === sel) ?? null : null
  const funnel = useMemo(
    () => STAGES.map((s) => (selRow ? selRow[s.key] : total[s.key] ?? 0)),
    [selRow, total],
  )
  const funnelPersons = useMemo(
    () => STAGES.map((s) => (selRow ? selRow[s.personKey] : totalPersons[s.key] ?? 0)),
    [selRow, totalPersons],
  )

  const base = funnel[0] || 0
  const hOf = (v: number) => (base ? (v / base) * MAX_H : 0)

  /** 단계 사이 이탈. 가장 큰 이탈을 빨갛게 강조해 병목이 바로 보이게 한다. */
  const drops = useMemo(() => funnel.slice(0, -1).map((v, i) => v - funnel[i + 1]), [funnel])
  const maxDrop = Math.max(0, ...drops)

  /* ── 수술 유형별 (참고) ──
   * 비중은 수술 통계(mart_surgery_monthly)의 그 해 누적을 실시간으로 읽는다.
   * ⚠️ 다만 '수술등록'은 수술예약이라 유형 정보가 없다 — 그래서 건수는 비중으로 나눈 **추정치**다.
   *    실제 수술 유형별 확정값은 수술 통계·월간 레포트를 볼 것. 화면에도 그렇게 밝힌다. */
  const { dataMap: surgeryMap } = useSurgeryTrend([CURRENT_YEAR])
  const typeTotals = useMemo(() => {
    const cells = surgeryMap[CURRENT_YEAR] ?? []
    return TYPE_DEFS.map((t) => ({
      ...t,
      n: cells.reduce((sum, c) => sum + ((c as unknown as Record<string, number | undefined>)?.[t.key] ?? 0), 0),
    })).filter((t) => t.n > 0).sort((a, b) => b.n - a.n)
  }, [surgeryMap])
  const typeSum = useMemo(() => typeTotals.reduce((s, t) => s + t.n, 0), [typeTotals])
  const surgeryCount = funnel[4]
  const types = useMemo(() => {
    if (!typeSum) return []
    const top = typeTotals[0]?.n ?? 1
    return typeTotals.map((t) => {
      const est = (t.n / typeSum) * surgeryCount
      return {
        ...t,
        w: `${(t.n / top) * 100}%`,
        count: est > 0 && est < 0.5 ? '<1건' : `${nf(Math.round(est))}건`,
        share: pct(t.n, typeSum),
      }
    })
  }, [typeTotals, typeSum, surgeryCount])

  const sortedRows = useMemo(() => {
    const arr = [...rows]
    if (sort === 'volume') arr.sort((a, b) => b.surgery - a.surgery)
    else if (sort === 'rate') arr.sort((a, b) => (b.reserved ? b.surgery / b.reserved : 0) - (a.reserved ? a.surgery / a.reserved : 0))
    else arr.sort((a, b) => b.reserved - a.reserved)
    return arr
  }, [rows, sort])
  const maxReserved = useMemo(() => Math.max(0, ...rows.map((r) => r.reserved)), [rows])

  const handleReset = () => {
    setDraftMonth(currentMonth()); setQueryMonth(currentMonth())
    setSort('default'); setMode('abs'); setSel(null); setTypeOpen(true)
  }

  const seg = (active: boolean) =>
    active ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-500 hover:text-slate-700'
  const gridCols = '112px repeat(5, minmax(0,1fr)) 96px'

  return (
    <PanelShell variant="bar" isLoading={loading} isError={isError}>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pb-2">
        {/* ── 헤더 ── */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-[22px] font-bold tracking-tight text-slate-900">예약 퍼널 · 채널별</h1>
              <span className="rounded-md bg-slate-200/70 px-2 py-[3px] text-[11px] font-semibold text-slate-600">
                {queryMonth.replace('-', '년 ')}월
              </span>
            </div>
            <p className="text-[13px] leading-relaxed text-slate-500">
              예약자 리스트를 채널로 묶어 단계별로 좁혀 봅니다. 합계는 예약자 리스트와 같습니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              aria-label="기준 월" type="month" value={draftMonth}
              onChange={(e) => setDraftMonth(e.target.value)}
              className="h-[34px] rounded-lg border border-slate-300 bg-white px-2.5 text-[13px] text-slate-900"
            />
            <Button className="h-[34px] gap-1.5 rounded-lg bg-slate-900 px-4 text-[13px] font-semibold hover:bg-slate-800"
              onClick={() => setQueryMonth(draftMonth)}>
              <Search className="h-3.5 w-3.5" /> 조회
            </Button>
            <Button variant="outline" className="h-[34px] gap-1.5 rounded-lg px-3.5 text-[13px]" onClick={handleReset}>
              <RotateCcw className="h-3.5 w-3.5" /> 초기화
            </Button>
          </div>
        </div>

        {/* ── 퍼널 카드 ── */}
        <div className="rounded-2xl border border-slate-200/80 bg-white px-7 pb-6 pt-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 flex-wrap items-baseline gap-3">
              <span className="whitespace-nowrap text-[15px] font-bold text-slate-900">
                {selRow ? `${selRow.channel} 퍼널` : '전체 퍼널'}
              </span>
              <span className="text-xs text-slate-400">
                예약 {nf(funnel[0])}건 · 최종 전환 {pct(funnel[4], funnel[0])}
                {maxDrop > 0 && ` · 가장 큰 이탈은 ${STAGES[drops.indexOf(maxDrop)].label} → ${STAGES[drops.indexOf(maxDrop) + 1].label}`}
              </span>
            </div>
            {selRow && (
              <button onClick={() => setSel(null)}
                className="flex h-[30px] items-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 pl-3 pr-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                {selRow.channel} 채널만 보기 <X className="h-3 w-3 text-slate-400" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-stretch">
            <div className="flex min-w-0 flex-1 flex-col justify-center" style={{ flexBasis: '640px' }}>
              {/* 단계 카드 — 건수 · 잔존율 · 사람수 */}
              <div className="grid grid-cols-2 sm:grid-cols-5">
                {STAGES.map((s, i) => {
                  const last = i === STAGES.length - 1
                  return (
                    <div key={s.key} title={s.hint}
                      onClick={last ? () => setTypeOpen((v) => !v) : undefined}
                      className={`flex min-w-0 flex-col gap-1.5 rounded-xl p-2.5 transition-colors ${last ? 'cursor-pointer' : ''}`}
                      style={{ background: last && typeOpen ? '#fff8eb' : 'transparent' }}>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 flex-none rounded" style={{ background: s.color }} />
                        <span className="truncate text-[12.5px] font-semibold text-slate-500">{s.label}</span>
                      </div>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-[25px] font-bold leading-none tracking-tight tabular-nums text-slate-900">
                          {nf(funnel[i])}
                        </span>
                        <span className="text-xs font-bold tabular-nums" style={{ color: i === 0 ? '#94a3b8' : s.color }}>
                          {i === 0 ? '전체' : pct(funnel[i], funnel[i - 1])}
                        </span>
                      </div>
                      <span className="min-h-[14px] text-[11px] font-medium tabular-nums text-slate-400">
                        {nf(funnelPersons[i])}명
                        {last && <span className="ml-1.5 font-semibold text-amber-600">{typeOpen ? '유형 닫기 ✕' : '유형 보기 →'}</span>}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* 퍼널 밴드 */}
              <div className="relative w-full">
                <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" className="block">
                  {STAGES.map((s, i) => {
                    const last = i === STAGES.length - 1
                    const vNext = last ? funnel[i] : funnel[i + 1]
                    const x0 = i * BAND_W, x1 = x0 + BAND_W
                    const h0 = hOf(funnel[i]), h1 = hOf(vNext)
                    const t0 = CY - h0 / 2, b0 = CY + h0 / 2, t1 = CY - h1 / 2, b1 = CY + h1 / 2
                    const cx0 = x0 + BAND_W * 0.45, cx1 = x0 + BAND_W * 0.55
                    return (
                      <g key={s.key} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                        onClick={last ? () => setTypeOpen((v) => !v) : undefined}
                        style={{ cursor: last ? 'pointer' : 'default' }}>
                        <rect x={x0} y={0} width={BAND_W} height={VB_H} fill="transparent" />
                        <path
                          d={`M${x0} ${t0}C${cx0} ${t0},${cx1} ${t1},${x1} ${t1}L${x1} ${b1}C${cx1} ${b1},${cx0} ${b0},${x0} ${b0}Z`}
                          fill={s.color}
                          opacity={hover == null || hover === i ? 1 : 0.45}
                          className="transition-opacity"
                        />
                      </g>
                    )
                  })}
                </svg>

                {/* 이탈 알약 */}
                {drops.map((d, i) => {
                  const big = d === maxDrop && d > 0
                  return (
                    <div key={i}
                      className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 items-baseline gap-1.5 rounded-full border px-2.5 py-1 shadow-sm"
                      style={{
                        left: `${(((i + 1) * BAND_W) / VB_W) * 100}%`, top: '50%',
                        background: big ? '#fef2f2' : '#fff', borderColor: big ? '#fecaca' : '#e8ecf1',
                      }}>
                      <span className="whitespace-nowrap text-xs font-bold tabular-nums text-red-600">
                        {d > 0 ? `−${nf(d)}` : '0'}
                      </span>
                      <span className="whitespace-nowrap text-[10.5px] font-semibold tabular-nums text-slate-400">
                        {pct(d, funnel[i])}
                      </span>
                    </div>
                  )
                })}

                {/* 호버 툴팁 */}
                {hover != null && (
                  <div className="pointer-events-none absolute z-10 min-w-[178px] -translate-x-1/2 -translate-y-[110%] rounded-xl bg-slate-900 px-3 py-2.5 shadow-lg"
                    style={{ left: `${((hover * BAND_W + BAND_W / 2) / VB_W) * 100}%`, top: `${((CY - hOf(funnel[hover]) / 2) / VB_H) * 100}%` }}>
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <span className="h-[7px] w-[7px] rounded-full" style={{ background: STAGES[hover].color }} />
                      <span className="text-xs font-bold text-white">{STAGES[hover].label}</span>
                    </div>
                    <div className="flex justify-between gap-3.5 text-[11.5px] leading-relaxed text-slate-300">
                      <span>진입</span><span className="font-semibold text-white">{nf(funnel[hover])}건 · {nf(funnelPersons[hover])}명</span>
                    </div>
                    <div className="flex justify-between gap-3.5 text-[11.5px] leading-relaxed text-slate-300">
                      <span>다음 단계 이탈</span>
                      <span className="font-semibold text-red-300">
                        {hover === STAGES.length - 1 ? '—' : `${nf(drops[hover])}건 (${pct(drops[hover], funnel[hover])})`}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3.5 text-[11.5px] leading-relaxed text-slate-300">
                      <span>잔존</span>
                      <span className="font-semibold text-white">
                        {hover === STAGES.length - 1
                          ? `최종 ${pct(funnel[4], funnel[0])}`
                          : `${nf(funnel[hover + 1])}건 (${pct(funnel[hover + 1], funnel[hover])})`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── 수술 유형별 (참고·추정) ── */}
            {typeOpen && (
              <div className="ml-7 flex min-w-[340px] flex-1 flex-col justify-center border-l border-slate-100 pl-7" style={{ flexBasis: '360px' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded" style={{ background: '#f59e0b' }} />
                      <span className="text-sm font-bold text-slate-900">수술 유형별</span>
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">추정</span>
                    </div>
                    <span className="text-[11.5px] leading-relaxed text-slate-400">
                      {selRow ? `${selRow.channel} · ` : ''}수술등록 {nf(surgeryCount)}건을 {CURRENT_YEAR}년 누적 유형 비중으로 배분
                    </span>
                  </div>
                  <button onClick={() => setTypeOpen(false)}
                    className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                    <X className="h-3 w-3" />
                  </button>
                </div>

                <div className="mt-3.5 flex flex-col">
                  {types.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-400">수술 통계를 불러오지 못했습니다.</p>
                  ) : types.map((t) => (
                    <div key={t.key} className="grid h-[26px] items-center gap-2.5"
                      style={{ gridTemplateColumns: '104px 1fr 46px 42px' }}>
                      <span className="truncate text-right text-[11.5px] font-semibold text-slate-500">{t.name}</span>
                      <div className="relative h-2.5 min-w-0">
                        <div className="absolute left-0 top-0 h-2.5 rounded-full"
                          style={{ width: t.w, minWidth: 4, background: t.color }} />
                      </div>
                      <span className="whitespace-nowrap text-right text-xs font-semibold tabular-nums text-slate-700">{t.count}</span>
                      <span className="whitespace-nowrap text-right text-[11px] tabular-nums text-slate-400">{t.share}</span>
                    </div>
                  ))}
                </div>

                <p className="mt-3 border-t border-slate-100 pt-2.5 text-[11px] leading-relaxed text-slate-400">
                  ⚠️ <b className="font-semibold text-slate-500">추정치입니다.</b> 수술등록은 <b className="font-semibold text-slate-500">수술예약</b>이라
                  유형 정보가 없어, {CURRENT_YEAR}년 누적 실제 수술의 유형 비중({nf(typeSum)}건 기준)으로 나눈 값입니다.
                  유형별 확정값은 <b className="font-semibold text-slate-500">수술 통계·월간 레포트</b>를 보세요.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── 채널별 표 ── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-5 border-b border-slate-100 px-6 pb-4 pt-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-bold text-slate-900">채널별 단계 통과</span>
              <span className="text-[11.5px] text-slate-400">행을 클릭하면 위 퍼널이 해당 채널 기준으로 바뀝니다</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold tracking-wide text-slate-400">정렬</span>
                <div className="flex rounded-lg bg-slate-100 p-0.5">
                  {([['default', '기본'], ['volume', '물량순'], ['rate', '전환율순']] as const).map(([k, label]) => (
                    <button key={k} onClick={() => setSort(k)}
                      className={`h-[26px] rounded-md px-2.5 text-xs font-semibold transition-colors ${seg(sort === k)}`}>{label}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold tracking-wide text-slate-400">막대</span>
                <div className="flex rounded-lg bg-slate-100 p-0.5">
                  {([['abs', '절대값'], ['rate', '전환율']] as const).map(([k, label]) => (
                    <button key={k} onClick={() => setMode(k)}
                      className={`h-[26px] rounded-md px-2.5 text-xs font-semibold transition-colors ${seg(mode === k)}`}>{label}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <div className="min-w-[1180px]">
              <div className="grid h-[38px] items-center border-b border-slate-100 bg-slate-50/60 px-6"
                style={{ gridTemplateColumns: gridCols }}>
                <span className="text-[11.5px] font-semibold text-slate-400">채널</span>
                {STAGES.map((s) => (
                  <div key={s.key} className="flex min-w-0 items-center gap-1.5 pl-2.5" title={s.hint}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
                    <span className="whitespace-nowrap text-[11.5px] font-semibold text-slate-500">{s.label}</span>
                    <span className="text-[10px] font-normal text-slate-300">건/명</span>
                  </div>
                ))}
                <span className="text-right text-[11.5px] font-semibold text-slate-400">최종 · 전월비</span>
              </div>

              {sortedRows.map((r) => {
                const final = r.reserved ? (r.surgery * 100) / r.reserved : 0
                const p = prevFinalByChannel[r.channel]
                const delta = p == null ? null : final - p
                return (
                  <div key={r.channel} onClick={() => setSel(sel === r.channel ? null : r.channel)}
                    className="grid h-11 cursor-pointer items-center border-b border-slate-50 px-6 transition-colors hover:bg-slate-50"
                    style={{ gridTemplateColumns: gridCols, background: sel === r.channel ? '#f1f6fd' : undefined }}>
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="h-4 w-[3px] rounded-sm" style={{ background: sel === r.channel ? '#2563eb' : 'transparent' }} />
                      <span className={`truncate text-[13px] text-slate-900 ${sel === r.channel ? 'font-bold' : 'font-medium'}`}>{r.channel}</span>
                    </div>
                    {STAGES.map((s, j) => {
                      const v = r[s.key]
                      const prevV = j === 0 ? 0 : r[STAGES[j - 1].key]
                      const w = mode === 'abs'
                        ? (maxReserved ? (v / maxReserved) * 100 : 0)
                        : (j === 0 ? 100 : (prevV ? (v / prevV) * 100 : 0))
                      return (
                        <div key={s.key} className="flex min-w-0 items-center gap-2 pl-2.5 pr-3.5">
                          <div className="relative h-[9px] min-w-[20px] flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div className="absolute inset-y-0 left-0 rounded-full"
                              style={{ width: `${Math.max(w, v > 0 ? 2 : 0)}%`, background: s.color, opacity: sel == null || sel === r.channel ? 1 : 0.3 }} />
                          </div>
                          <span className="w-9 flex-none text-right text-[12.5px] font-semibold tabular-nums text-slate-800">{nf(v)}</span>
                          <span className="w-8 flex-none text-right text-[11px] tabular-nums text-slate-400" title="사람 수">{nf(r[s.personKey])}명</span>
                          <span className="w-10 flex-none text-right text-[11.5px] tabular-nums"
                            style={{ color: j > 0 && prevV && v / prevV < 0.7 ? '#dc2626' : '#94a3b8' }}>
                            {j === 0 ? '' : pct(v, prevV)}
                          </span>
                        </div>
                      )
                    })}
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-[13px] font-bold tabular-nums text-slate-900">{final.toFixed(1).replace(/\.0$/, '')}%</span>
                      <span className="w-14 text-right text-[11.5px] font-semibold tabular-nums"
                        style={{ color: delta == null ? '#cbd5e1' : Math.abs(delta) < 0.05 ? '#94a3b8' : delta > 0 ? '#16a34a' : '#dc2626' }}>
                        {delta == null ? '—' : `${delta >= 0 ? '+' : '−'}${Math.abs(delta).toFixed(1)}%p`}
                      </span>
                    </div>
                  </div>
                )
              })}

              <div className="grid h-12 items-center bg-slate-50/60 px-6" style={{ gridTemplateColumns: gridCols }}>
                <span className="text-[13px] font-bold text-slate-900">합계</span>
                {STAGES.map((s, i) => (
                  <div key={s.key} className="flex min-w-0 items-center gap-2 pl-2.5 pr-3.5">
                    <div className="min-w-[20px] flex-1" />
                    <span className="w-9 flex-none text-right text-[13px] font-bold tabular-nums text-slate-900">{nf(total[s.key] ?? 0)}</span>
                    <span className="w-8 flex-none text-right text-[11px] font-semibold tabular-nums text-slate-500">{nf(totalPersons[s.key] ?? 0)}명</span>
                    <span className="w-10 flex-none text-right text-[11.5px] font-semibold tabular-nums text-slate-500">
                      {i === 0 ? '' : pct(total[s.key], total[STAGES[i - 1].key])}
                    </span>
                  </div>
                ))}
                <span className="text-right text-[13px] font-bold tabular-nums text-slate-900">
                  {pct(total.surgery, total.reserved)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 각주 ── */}
        <div className="flex flex-col gap-1 px-1">
          <p className="text-[11.5px] leading-relaxed text-slate-400">
            ※ <b className="font-semibold text-slate-500">건수</b>는 채널이 몇 번 유치했나, <b className="font-semibold text-slate-500">명</b>은 실제 몇 명인가입니다 — 같은 사람이 취소 후 다시 잡으면 2건 1명입니다.
            사람 식별은 휴대폰 &gt; 이메일 &gt; 차트번호 &gt; 이름 순이며 커버리지는 99.9%입니다(연락처는 화면·CSV에 나가지 않습니다).
            <b className="font-semibold text-slate-500"> 사람수는 채널 합계가 전체와 다릅니다</b> — 한 사람이 두 채널로 예약하면 채널마다 1명씩 세어지므로, 합계행은 전체 기준값을 씁니다.
          </p>
          <p className="text-[11.5px] leading-relaxed text-slate-400">
            ※ 채널은 <b className="font-semibold text-slate-500">내원동기(중)의 매체명 → 자사 담당자 → 예약경로</b> 순으로 판정합니다.
            모두닥·카페처럼 매체를 보고 전화로 예약하면 경로는 인콜이지만 채널은 매체로 잡힙니다.
            카카오는 해피톡 소스라 예약자 리스트에 들어오지 않아 채널에 두지 않았습니다.
          </p>
          <p className="text-[11.5px] leading-relaxed text-slate-400">
            ※ <b className="font-semibold text-slate-500">수술등록</b>은 수술한 날이 아니라 <b className="font-semibold text-slate-500">수술예약을 등록한 날</b> 기준이라 수술 통계(실제 수술)와 숫자가 다릅니다.
            이 화면은 <b className="font-semibold text-slate-500">시력교정 유입만</b> 다룹니다 — 백내장은 예약 경로가 달라(내원 기준) 예약자 리스트에 들어오지 않습니다.
            <b className="font-semibold text-slate-500"> 전월 대비</b>는 이전 달을 실제로 조회해 계산한 값입니다(추정 아님).
            <b className="font-semibold text-slate-500"> 수술 유형별</b>만 추정치입니다.
          </p>
        </div>
      </div>
    </PanelShell>
  )
}
