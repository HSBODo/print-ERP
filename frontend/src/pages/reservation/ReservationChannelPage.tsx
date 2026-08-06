import { useMemo, useState } from 'react'
import { ChevronDown, ChevronsUpDown, ChevronUp, RotateCcw, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PanelShell } from '@/components/PanelShell'
import { useReservationChannel } from '@/hooks/reservation/useReservationChannel'
import { useSurgeryTrend } from '@/hooks/surgery/useSurgeryTrend'
import { CURRENT_YEAR } from '@/constants/chart'
import type { ReservationChannelFunnelItem } from '@/api/reservation/reservationChannel'

/**
 * 예약통계_채널별 — 예약자 리스트를 채널로 묶어 단계별로 좁혀 보는 화면.
 *
 * 단계는 예약자 리스트에서 차례로 걸러낸 것이다.
 *   예약 → 취소 제외 → 접수(내원) → 검사 → 수술등록
 *
 * ★ 이 화면은 **사람 수만** 센다(건수 아님).
 *   같은 사람이 취소 후 다시 잡아도 1명이다. 실제 몇 명이 왔는지가 알고 싶은 값이라서다.
 *   식별은 휴대폰 > 이메일 > 차트번호 > 이름 순(v_reservation_channel.person, 커버리지 99.9%).
 *   API 는 건수도 같이 주지만 화면에서는 쓰지 않는다 — 숫자가 두 벌이면 읽기 어렵다.
 *
 * 채널 판정은 v_reservation_channel 이 한다(내원동기 매체명 > 직원 설정표 > 예약경로).
 * 화면은 판정을 하지 않는다 — 규칙을 바꾸려면 뷰만 고치면 된다.
 */

/* ── 단계 정의 ── 순서가 곧 퍼널 순서다.
 * personKey  채널별 사람 수
 * totalKey   전체(채널 무관) 사람 수 — 합계행 전용.
 *            채널별 값을 더하면 안 된다: 한 사람이 두 채널로 예약하면 채널마다 1명씩 세어진다. */
type PersonKey = keyof Pick<ReservationChannelFunnelItem,
  'reservedPersons' | 'notCancelPersons' | 'visitedPersons' | 'examinedPersons' | 'surgeryPersons'>
type TotalKey = keyof Pick<ReservationChannelFunnelItem,
  'totalReservedPersons' | 'totalNotCancelPersons' | 'totalVisitedPersons' | 'totalExaminedPersons' | 'totalSurgeryPersons'>

const STAGES: { personKey: PersonKey; totalKey: TotalKey; label: string; hint: string; color: string }[] = [
  { personKey: 'reservedPersons',  totalKey: 'totalReservedPersons',  label: '예약',     hint: '등록일 기준 예약한 사람', color: '#1e3a8a' },
  { personKey: 'notCancelPersons', totalKey: 'totalNotCancelPersons', label: '취소 제외', hint: '예약을 취소하지 않은 사람', color: '#2563eb' },
  { personKey: 'visitedPersons',   totalKey: 'totalVisitedPersons',   label: '접수',     hint: '미내원까지 빼고 실제 내원한 사람', color: '#0ea5e9' },
  { personKey: 'examinedPersons',  totalKey: 'totalExaminedPersons',  label: '검사',     hint: '검사등록일이 있는 사람', color: '#10b981' },
  { personKey: 'surgeryPersons',   totalKey: 'totalSurgeryPersons',   label: '수술등록',  hint: '수술예약을 등록한 사람 — 수술한 날이 아니다', color: '#f59e0b' },
]

/** 수술 유형 — 비중은 하드코딩하지 않고 수술 통계 API 에서 그 해 누적으로 가져온다.
 *  수술 정의가 바뀌면(KPL·PIOL 처럼) 이 화면도 자동으로 따라온다. */
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

/** 정렬 키 — 'channel' | 단계 인덱스('0'~'4') | 'final'. 헤더를 눌러 바꾼다. */
type SortKey = string
type SortDir = 'asc' | 'desc'

/** 머리글 정렬 표시. 컴포넌트 밖에 둔다 — 렌더마다 새로 만들면 매번 다시 마운트된다. */
const SortIcon = ({ active, dir }: { active: boolean; dir: SortDir }) => {
  if (!active) return <ChevronsUpDown className="h-3 w-3 flex-none text-slate-300" />
  return dir === 'asc'
    ? <ChevronUp className="h-3 w-3 flex-none text-slate-600" />
    : <ChevronDown className="h-3 w-3 flex-none text-slate-600" />
}

export function ReservationChannelPage() {
  const [draftMonth, setDraftMonth] = useState(currentMonth())
  const [queryMonth, setQueryMonth] = useState(currentMonth())
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: '0', dir: 'desc' })
  const [sel, setSel] = useState<string | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  // 기본 열림 — 정보를 먼저 보여주고, 필요 없으면 ✕ 로 닫게 한다.
  const [typeOpen, setTypeOpen] = useState(true)

  const { from, to } = useMemo(() => monthRange(queryMonth), [queryMonth])
  const { rows, isLoading, isFetching, isError } = useReservationChannel(from, to)
  const loading = isLoading || isFetching

  /** 합계는 채널 값을 더하지 않고 서버가 준 전체 기준값을 쓴다 —
   *  한 사람이 두 채널로 예약하면 채널마다 1명씩 세어져 더하면 중복된다. */
  const total = useMemo(
    () => STAGES.map((s) => rows[0]?.[s.totalKey] ?? 0),
    [rows],
  )

  const selRow = sel ? rows.find((r) => r.channel === sel) ?? null : null
  /** 퍼널이 그리는 값 — 채널을 고르면 그 채널, 아니면 전체 */
  const funnel = useMemo(
    () => STAGES.map((s, i) => (selRow ? selRow[s.personKey] : total[i])),
    [selRow, total],
  )

  const base = funnel[0] || 0
  const hOf = (v: number) => (base ? (v / base) * MAX_H : 0)

  /** 단계 사이 이탈. 가장 큰 이탈을 빨갛게 강조해 병목이 바로 보이게 한다. */
  const drops = useMemo(() => funnel.slice(0, -1).map((v, i) => v - funnel[i + 1]), [funnel])
  const maxDrop = Math.max(0, ...drops)

  /* ── 수술 유형별 (참고) ──
   * 비중은 수술 통계(mart_surgery_monthly)의 그 해 누적을 실시간으로 읽는다.
   * ⚠️ '수술등록'은 수술예약이라 유형 정보가 없다 — 그래서 인원은 비중으로 나눈 **추정치**다. */
  const { dataMap: surgeryMap } = useSurgeryTrend([CURRENT_YEAR])
  const typeTotals = useMemo(() => {
    const cells = surgeryMap[CURRENT_YEAR] ?? []
    return TYPE_DEFS.map((t) => ({
      ...t,
      n: cells.reduce((sum, c) => sum + ((c as unknown as Record<string, number | undefined>)?.[t.key] ?? 0), 0),
    })).filter((t) => t.n > 0).sort((a, b) => b.n - a.n)
  }, [surgeryMap])
  const typeSum = useMemo(() => typeTotals.reduce((s, t) => s + t.n, 0), [typeTotals])
  const surgeryPeople = funnel[4]
  const types = useMemo(() => {
    if (!typeSum) return []
    const top = typeTotals[0]?.n ?? 1
    return typeTotals.map((t) => {
      const est = (t.n / typeSum) * surgeryPeople
      return {
        ...t,
        w: `${(t.n / top) * 100}%`,
        count: est > 0 && est < 0.5 ? '<1명' : `${nf(Math.round(est))}명`,
        share: pct(t.n, typeSum),
      }
    })
  }, [typeTotals, typeSum, surgeryPeople])

  const finalRate = (r: ReservationChannelFunnelItem) =>
    r.reservedPersons ? (r.surgeryPersons * 100) / r.reservedPersons : 0

  const sortedRows = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      if (sort.key === 'channel') return a.channel.localeCompare(b.channel, 'ko') * dir
      if (sort.key === 'final') return (finalRate(a) - finalRate(b)) * dir
      const s = STAGES[Number(sort.key)]
      return ((a[s.personKey] ?? 0) - (b[s.personKey] ?? 0)) * dir
    })
  }, [rows, sort])

  /** 같은 칸을 다시 누르면 방향만 뒤집는다. 다른 칸은 큰 값부터(내림차순) 시작 —
   *  인원 칸은 보통 많은 쪽을 먼저 보고 싶어서다. 채널명만 가나다순(오름차순)으로 시작한다. */
  const toggleSort = (key: SortKey) =>
    setSort((p) => (p.key === key ? { key, dir: p.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'channel' ? 'asc' : 'desc' }))

  const maxReserved = useMemo(() => Math.max(0, ...rows.map((r) => r.reservedPersons)), [rows])

  const handleReset = () => {
    setDraftMonth(currentMonth()); setQueryMonth(currentMonth())
    setSort({ key: '0', dir: 'desc' }); setSel(null); setTypeOpen(true)
  }

  const gridCols = '112px repeat(5, minmax(0,1fr)) 64px'

  return (
    <PanelShell variant="bar" isLoading={loading} isError={isError}>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {/* ── 헤더 ── */}
        <div className="flex shrink-0 flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-[22px] font-bold tracking-tight text-slate-900">예약 퍼널 · 채널별</h1>
              <span className="rounded-md bg-slate-200/70 px-2 py-[3px] text-[11px] font-semibold text-slate-600">
                {queryMonth.replace('-', '년 ')}월
              </span>
              <span className="rounded-md bg-slate-900 px-2 py-[3px] text-[11px] font-semibold text-white">사람 수</span>
            </div>
            <p className="text-[13px] leading-relaxed text-slate-500">
              예약자 리스트를 채널로 묶어 단계별로 좁혀 봅니다. 모든 숫자는 <b className="font-semibold text-slate-700">사람 수</b>입니다.
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
        <div className="shrink-0 rounded-2xl border border-slate-200/80 bg-white px-7 pb-6 pt-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 flex-wrap items-baseline gap-3">
              <span className="whitespace-nowrap text-[15px] font-bold text-slate-900">
                {selRow ? `${selRow.channel} 퍼널` : '전체 퍼널'}
              </span>
              <span className="text-xs text-slate-400">
                예약 {nf(funnel[0])}명 · 최종 전환 {pct(funnel[4], funnel[0])}
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
              {/* 단계 카드 — 사람 수(검정) + 직전 대비 잔존율 */}
              <div className="grid grid-cols-2 sm:grid-cols-5">
                {STAGES.map((s, i) => {
                  const last = i === STAGES.length - 1
                  return (
                    <div key={s.label} title={s.hint}
                      onClick={last ? () => setTypeOpen((v) => !v) : undefined}
                      className={`flex min-w-0 flex-col gap-1.5 rounded-xl p-2.5 transition-colors ${last ? 'cursor-pointer' : ''}`}
                      style={{ background: last && typeOpen ? '#fff8eb' : 'transparent' }}>
                      <div className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 flex-none rounded" style={{ background: s.color }} />
                        <span className="truncate text-[12.5px] font-semibold text-slate-500">{s.label}</span>
                      </div>
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <span className="text-[26px] font-bold leading-none tracking-tight tabular-nums text-slate-900">
                          {nf(funnel[i])}
                        </span>
                        <span className="text-[13px] font-semibold text-slate-500">명</span>
                        <span className="ml-1 text-xs font-bold tabular-nums" style={{ color: i === 0 ? '#94a3b8' : s.color }}>
                          {i === 0 ? '전체' : pct(funnel[i], funnel[i - 1])}
                        </span>
                      </div>
                      <span className="min-h-[14px] text-[11px] font-semibold text-amber-600">
                        {last ? (typeOpen ? '유형 닫기 ✕' : '유형 보기 →') : ''}
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
                      <g key={s.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
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
                        {d > 0 ? `−${nf(d)}명` : '0'}
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
                      <span>진입</span><span className="font-semibold text-white">{nf(funnel[hover])}명</span>
                    </div>
                    <div className="flex justify-between gap-3.5 text-[11.5px] leading-relaxed text-slate-300">
                      <span>다음 단계 이탈</span>
                      <span className="font-semibold text-red-300">
                        {hover === STAGES.length - 1 ? '—' : `${nf(drops[hover])}명 (${pct(drops[hover], funnel[hover])})`}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3.5 text-[11.5px] leading-relaxed text-slate-300">
                      <span>잔존</span>
                      <span className="font-semibold text-white">
                        {hover === STAGES.length - 1
                          ? `최종 ${pct(funnel[4], funnel[0])}`
                          : `${nf(funnel[hover + 1])}명 (${pct(funnel[hover + 1], funnel[hover])})`}
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
                      {selRow ? `${selRow.channel} · ` : ''}수술등록 {nf(surgeryPeople)}명을 {CURRENT_YEAR}년 누적 유형 비중으로 배분
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
                      style={{ gridTemplateColumns: '104px 1fr 48px 42px' }}>
                      <span className="truncate text-right text-[11.5px] font-semibold text-slate-500">{t.name}</span>
                      <div className="relative h-2.5 min-w-0">
                        <div className="absolute left-0 top-0 h-2.5 rounded-full"
                          style={{ width: t.w, minWidth: 4, background: t.color }} />
                      </div>
                      <span className="whitespace-nowrap text-right text-xs font-bold tabular-nums text-slate-900">{t.count}</span>
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
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex shrink-0 flex-col gap-0.5 border-b border-slate-100 px-6 pb-3 pt-4">
            <span className="text-[15px] font-bold text-slate-900">채널별 단계 통과</span>
            <span className="text-[11.5px] text-slate-400">
              행을 클릭하면 위 퍼널이 해당 채널 기준으로 바뀝니다 · 머리글을 클릭하면 정렬됩니다 · 단위는 명
            </span>
          </div>

          <div className="min-h-0 w-full flex-1 overflow-auto">
            <div className="min-w-[1040px]">
              <div className="sticky top-0 z-10 grid h-[38px] items-center border-b border-slate-100 bg-slate-50 px-6"
                style={{ gridTemplateColumns: gridCols }}>
                <button onClick={() => toggleSort('channel')}
                  className="flex items-center gap-1 text-left text-[11.5px] font-semibold text-slate-400 hover:text-slate-600">
                  채널 <SortIcon active={sort.key === 'channel'} dir={sort.dir} />
                </button>
                {STAGES.map((s, i) => (
                  <button key={s.label} onClick={() => toggleSort(String(i))} title={s.hint}
                    className="flex min-w-0 items-center gap-1.5 pl-2.5 hover:opacity-80">
                    <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: s.color }} />
                    <span className="whitespace-nowrap text-[11.5px] font-semibold text-slate-500">{s.label}</span>
                    <SortIcon active={sort.key === String(i)} dir={sort.dir} />
                  </button>
                ))}
                <button onClick={() => toggleSort('final')}
                  className="flex items-center justify-end gap-1 text-[11.5px] font-semibold text-slate-400 hover:text-slate-600">
                  최종 <SortIcon active={sort.key === 'final'} dir={sort.dir} />
                </button>
              </div>

              {sortedRows.map((r) => {
                const final = r.reservedPersons ? (r.surgeryPersons * 100) / r.reservedPersons : 0
                // 이 기간에 유입이 0 인 채널 — 행은 남기되 회색으로 죽여 둔다.
                // 지우면 "채널이 없는 것"과 "이번 달 0명"이 구분되지 않고 달마다 행 수가 흔들린다.
                const empty = r.reservedPersons === 0
                return (
                  <div key={r.channel} onClick={empty ? undefined : () => setSel(sel === r.channel ? null : r.channel)}
                    className={`grid h-11 items-center border-b border-slate-50 px-6 transition-colors ${empty ? 'cursor-default' : 'cursor-pointer hover:bg-slate-50'}`}
                    style={{ gridTemplateColumns: gridCols, background: sel === r.channel ? '#f1f6fd' : undefined }}>
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="h-4 w-[3px] rounded-sm" style={{ background: sel === r.channel ? '#2563eb' : 'transparent' }} />
                      <span className={`truncate text-[13px] ${empty ? 'font-normal text-slate-300' : sel === r.channel ? 'font-bold text-slate-900' : 'font-medium text-slate-900'}`}>{r.channel}</span>
                    </div>
                    {STAGES.map((s, j) => {
                      const v = r[s.personKey]
                      const prevV = j === 0 ? 0 : r[STAGES[j - 1].personKey]
                      // 막대 폭은 최대 채널 인원 기준 — 채널끼리 규모가 비교돼야 한다.
                      const w = maxReserved ? (v / maxReserved) * 100 : 0
                      return (
                        <div key={s.label} className="flex min-w-0 items-center gap-2 pl-2.5 pr-3.5">
                          <div className="relative h-[9px] min-w-[20px] flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div className="absolute inset-y-0 left-0 rounded-full"
                              style={{ width: `${Math.max(w, v > 0 ? 2 : 0)}%`, background: s.color, opacity: sel == null || sel === r.channel ? 1 : 0.3 }} />
                          </div>
                          <span className={`w-10 flex-none text-right text-[13.5px] tabular-nums ${empty ? 'font-normal text-slate-300' : 'font-bold text-slate-900'}`}>{nf(v)}</span>
                          <span className="w-10 flex-none text-right text-[11.5px] tabular-nums"
                            style={{ color: j > 0 && prevV && v / prevV < 0.7 ? '#dc2626' : '#94a3b8' }}>
                            {j === 0 ? '' : pct(v, prevV)}
                          </span>
                        </div>
                      )
                    })}
                    <div className="flex items-center justify-end gap-2">
                      <span className={`text-[13px] tabular-nums ${empty ? 'font-normal text-slate-300' : 'font-bold text-slate-900'}`}>
                        {empty ? '—' : `${final.toFixed(1).replace(/\.0$/, '')}%`}
                      </span>
                    </div>
                  </div>
                )
              })}

              <div className="grid h-12 items-center bg-slate-50/60 px-6" style={{ gridTemplateColumns: gridCols }}>
                <span className="text-[13px] font-bold text-slate-900">전체</span>
                {STAGES.map((s, i) => (
                  <div key={s.label} className="flex min-w-0 items-center gap-2 pl-2.5 pr-3.5">
                    <div className="min-w-[20px] flex-1" />
                    <span className="w-10 flex-none text-right text-[13.5px] font-bold tabular-nums text-slate-900">{nf(total[i])}</span>
                    <span className="w-10 flex-none text-right text-[11.5px] font-semibold tabular-nums text-slate-500">
                      {i === 0 ? '' : pct(total[i], total[i - 1])}
                    </span>
                  </div>
                ))}
                <span className="text-right text-[13px] font-bold tabular-nums text-slate-900">
                  {pct(total[4], total[0])}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </PanelShell>
  )
}
