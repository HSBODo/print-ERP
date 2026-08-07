import { useMemo, useState } from 'react'
import { ChevronDown, ChevronsUpDown, ChevronUp, Info, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PanelShell } from '@/components/PanelShell'
import { useReservationChannel } from '@/hooks/reservation/useReservationChannel'
import {
  useAdSpend,
  useChannelLensCost,
  useLensPrices,
  useSaveAdSpend,
  useSaveLensPrices,
} from '@/hooks/marketing/useChannelProfit'
import {
  buildAdRows,
  buildChannelRows,
  fmtEok,
  fmtInt,
  fmtPct,
  fmtRatio,
  SAMPLE_LOW,
  SAMPLE_WARN,
  type ChannelProfitRow,
} from './channelProfitModel'

/**
 * 채널별 수익성 — 유입채널이 얼마를 남겼고, 광고매체가 얼마를 회수했는지.
 *
 * 옆 메뉴 `예약통계_채널별`(퍼널)과 짝이다. 그쪽이 "얼마나 오나"(전환 축)라면
 * 이쪽은 "얼마 버나"(가치 축)다. 같은 v_reservation_channel 을 읽으므로 인원이 항상 맞는다.
 *
 * ★ 탭이 둘인 이유 — 유입채널과 광고매체는 **같은 축이 아니다**.
 *   광고는 모두닥·네이버 두 곳에만 집행하므로 나머지 9개 채널은 광고비가 0원이다.
 *   한 표에 섞으면 ROAS 칸의 9할이 비어 "성과 없음"으로 오독된다.
 *     탭1 유입채널 수익성 — 11개 채널 전부. 광고비와 무관한 수익성만 본다.
 *     탭2 광고매체 효율   — 광고비가 있는 상품만. 여기서만 CPA·ROAS 를 낸다.
 *
 * ★ 화면은 계산 규칙을 갖지 않는다. 채널 판정은 뷰가, 지표 계산은 channelProfitModel 이 한다.
 */

/* ── 기간 헬퍼 ── 다른 통계 화면과 같은 규칙(진행 중인 달은 오늘까지). */
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

type SortKey = keyof Pick<
  ChannelProfitRow,
  'surgeryDone' | 'revenueManwon' | 'arpuManwon' | 'convRate' | 'lensRate' | 'lensCostManwon' | 'reop' | 'contribManwon'
>
type SortDir = 'asc' | 'desc'

/** 탭1 칼럼. `bl` 은 지표 묶음(성과 / 전환 / 원가·품질)의 경계선. */
const COLS: { key: SortKey; label: string; bl?: boolean; hl?: boolean }[] = [
  { key: 'surgeryDone', label: '수술완료' },
  { key: 'revenueManwon', label: '수납액' },
  { key: 'arpuManwon', label: '객단가' },
  { key: 'convRate', label: '예약→수술', bl: true },
  { key: 'lensRate', label: '렌즈삽입률', bl: true },
  { key: 'lensCostManwon', label: '렌즈원가' },
  { key: 'reop', label: '재수술' },
  { key: 'contribManwon', label: '공헌이익(렌즈만)', bl: true, hl: true },
]

const SortIcon = ({ active, dir }: { active: boolean; dir: SortDir }) =>
  !active ? <ChevronsUpDown className="h-3 w-3 flex-none text-slate-400" />
  : dir === 'asc' ? <ChevronUp className="h-3 w-3 flex-none text-slate-800" />
  : <ChevronDown className="h-3 w-3 flex-none text-slate-800" />

const Kpi = ({ label, value, unit, hint }: { label: string; value: string; unit: string; hint: string }) => (
  <div className="flex items-center gap-3.5 rounded-xl border border-border/70 bg-white px-5 py-4 shadow-sm">
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-[11.5px] font-semibold text-slate-700">{label}</span>
      <div className="flex flex-wrap items-baseline gap-1.5">
        <span className="whitespace-nowrap text-[23px] font-bold tracking-tight text-slate-900 tabular-nums">
          {value}
          <span className="text-[13px] font-semibold text-slate-600"> {unit}</span>
        </span>
        <span className="whitespace-nowrap text-[11px] text-slate-600">{hint}</span>
      </div>
    </div>
  </div>
)

export function ChannelProfitPage() {
  const [draftMonth, setDraftMonth] = useState(currentMonth())
  const [queryMonth, setQueryMonth] = useState(currentMonth())
  const [tab, setTab] = useState<'profit' | 'ads'>('profit')
  const [onlyComparable, setOnlyComparable] = useState(false)
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'revenueManwon', dir: 'desc' })

  const { from, to } = useMemo(() => monthRange(queryMonth), [queryMonth])
  const funnel = useReservationChannel(from, to)
  const lens = useChannelLensCost(from, to)
  const ads = useAdSpend(queryMonth)
  const prices = useLensPrices()
  const saveAds = useSaveAdSpend(queryMonth)
  const savePrices = useSaveLensPrices()

  const loading = funnel.isLoading || funnel.isFetching || lens.isLoading
  const isError = funnel.isError || lens.isError

  const rows = useMemo(() => buildChannelRows(funnel.rows, lens.rows), [funnel.rows, lens.rows])
  const adRows = useMemo(() => buildAdRows(funnel.rows, rows, ads.rows), [funnel.rows, rows, ads.rows])

  /**
   * 입력 초안 — **사용자가 고친 값만** 담고, 나머지는 서버 값을 그대로 읽는다.
   * 서버 값을 state 로 복사해 두면 effect 로 동기화해야 하는데,
   * effect 안의 setState 는 연쇄 렌더를 부르고 저장 직후 낡은 값이 되살아난다.
   * 광고비 키에 월을 붙여 달을 바꾸면 초안이 자연히 비워지게 했다.
   */
  const [adEdits, setAdEdits] = useState<Record<string, number>>({})
  const [priceEdits, setPriceEdits] = useState<Record<string, number>>({})
  const adKey = (media: string) => `${queryMonth}:${media}`
  const adValue = (media: string, server: number) => adEdits[adKey(media)] ?? server
  const priceValue = (opType: string, server: number) => priceEdits[opType] ?? server

  const visible = useMemo(() => {
    const base = onlyComparable ? rows.filter((r) => r.surgeryDone >= SAMPLE_LOW) : rows
    const { key, dir } = sort
    const f = dir === 'asc' ? 1 : -1
    // null 은 항상 아래로 — 미입력이 상위에 오면 "가장 좋은 채널"로 잘못 읽힌다.
    return [...base].sort((a, b) => {
      const av = a[key], bv = b[key]
      if (av === null && bv === null) return 0
      if (av === null) return 1
      if (bv === null) return -1
      return (av - bv) * f
    })
  }, [rows, onlyComparable, sort])

  const totals = useMemo(() => {
    const f0 = funnel.rows[0]
    const revenue = rows.reduce((s, r) => s + r.revenueManwon, 0)
    const lensCost = rows.reduce((s, r) => s + r.lensCostManwon, 0)
    const anyUnpriced = rows.some((r) => r.lensUnpricedEyes > 0)
    return {
      // 합계 인원은 채널 값을 더하지 않는다 — 한 사람이 두 채널로 예약하면 중복된다.
      surgeryDone: f0?.totalSurgeryDonePersons ?? 0,
      revenue,
      arpu: f0 && f0.totalSurgeryPaidPersons > 0 ? Math.round(revenue / f0.totalSurgeryPaidPersons) : null,
      lensCost,
      contrib: anyUnpriced ? null : revenue - lensCost,
      lowSamples: rows.filter((r) => r.surgeryDone < SAMPLE_WARN).length,
      anyUnpriced,
    }
  }, [rows, funnel.rows])

  const toggleSort = (key: SortKey) =>
    setSort((p) => (p.key === key ? { key, dir: p.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }))

  const cell = (v: string, opts?: { bl?: boolean; hl?: boolean; dim?: boolean; strong?: boolean }) => (
    <div
      className={`flex items-center justify-end px-4 py-2 text-right text-[12.5px] tabular-nums ${
        opts?.bl ? 'border-l border-border/50' : ''
      } ${opts?.hl ? 'bg-slate-50' : ''} ${
        opts?.dim ? 'text-slate-400' : opts?.strong ? 'font-bold text-slate-900' : 'text-slate-800'
      }`}
    >
      {v}
    </div>
  )

  const GRID = 'grid grid-cols-[minmax(160px,1.4fr)_repeat(8,minmax(0,1fr))]'

  return (
    <div className="flex flex-col gap-4 text-xs text-gray-800">
      {/* 헤더 + 기간 */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[22px] font-bold tracking-tight text-slate-900">채널별 수익성</h1>
          <p className="text-[13px] text-slate-700">
            유입채널의 수익성과 광고매체의 투자 효율을 나눠서 봅니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            aria-label="기준 월"
            type="month"
            value={draftMonth}
            onChange={(e) => setDraftMonth(e.target.value)}
            className="h-8 rounded-md border border-border/70 bg-white px-2 text-xs"
          />
          <Button size="sm" className="h-8 gap-1 px-3 text-xs" onClick={() => setQueryMonth(draftMonth)}>
            <Search className="h-3.5 w-3.5" /> 조회
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="전체 수술완료" value={fmtInt(totals.surgeryDone)} unit="명" hint={`${rows.length}개 유입채널`} />
        <Kpi label="수납액" value={fmtEok(totals.revenue)} unit="억" hint="할인·환불 미기록" />
        <Kpi
          label="공헌이익(렌즈만)"
          value={totals.contrib === null ? '—' : fmtEok(totals.contrib)}
          unit="억"
          hint={totals.anyUnpriced ? '렌즈 단가 미입력' : '렌즈원가 반영'}
        />
        <Kpi label="표본 주의 채널" value={fmtInt(totals.lowSamples)} unit="개" hint={`수술완료 ${SAMPLE_WARN}명 미만`} />
      </div>

      <PanelShell isLoading={loading} isError={isError} variant="bar">
        <div className="overflow-hidden rounded-xl border border-border/70 bg-white shadow-sm">
          {/* 탭 */}
          <div className="flex items-stretch gap-1 border-b border-border/60 px-5">
            {([
              ['profit', '유입채널 수익성', `${rows.length}개 채널`],
              ['ads', '광고매체 효율', `${adRows.length}개 상품`],
            ] as const).map(([k, label, sub]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`-mb-px flex flex-col justify-center gap-0.5 border-b-[3px] px-4 py-3 text-left transition-colors ${
                  tab === k ? 'border-blue-700 text-slate-900' : 'border-transparent text-slate-600 hover:text-slate-800'
                }`}
              >
                <span className="text-sm font-bold">{label}</span>
                <span className="text-[11px] text-slate-600">{sub}</span>
              </button>
            ))}
          </div>

          {tab === 'profit' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4 px-5 pb-3 pt-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-bold text-slate-900">유입채널 수익성 비교</span>
                  <span className="text-[11.5px] text-slate-600">
                    광고 매체가 아닌 실제 예약·유입경로 기준입니다. 인원은 예약통계_채널별과 같습니다.
                  </span>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-[12.5px] font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={onlyComparable}
                    onChange={(e) => setOnlyComparable(e.target.checked)}
                    className="h-3.5 w-3.5 accent-blue-700"
                  />
                  비교 가능 표본만
                </label>
              </div>

              <div className="w-full overflow-x-auto">
                <div className="min-w-[1120px]">
                  {/* 머리글 */}
                  <div className={`${GRID} h-9 items-center border-y border-border/50 bg-slate-50/60`}>
                    <span className="pl-5 text-[11.5px] font-semibold text-slate-600">채널</span>
                    {COLS.map((c) => (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => toggleSort(c.key)}
                        className={`flex h-9 items-center justify-end gap-1 px-4 text-[11.5px] transition-colors hover:text-slate-900 ${
                          c.bl ? 'border-l border-border/50' : ''
                        } ${c.hl ? 'bg-slate-100/70' : ''} ${
                          sort.key === c.key ? 'font-bold text-slate-900' : 'font-semibold text-slate-600'
                        }`}
                      >
                        {c.label}
                        <SortIcon active={sort.key === c.key} dir={sort.dir} />
                      </button>
                    ))}
                  </div>

                  {visible.map((r) => (
                    <div key={r.channel} className={`${GRID} items-stretch border-b border-border/40 hover:bg-slate-50/70`}>
                      <div className="flex items-center gap-2 py-2 pl-5">
                        <span className={`text-[12.5px] font-bold ${r.grade === 'low' ? 'text-slate-600' : 'text-slate-900'}`}>
                          {r.channel}
                        </span>
                        {r.grade !== 'ok' && (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              r.grade === 'low' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'
                            }`}
                          >
                            {r.grade === 'low' ? `n=${r.surgeryDone}` : '표본 주의'}
                          </span>
                        )}
                      </div>
                      {cell(fmtInt(r.surgeryDone), { strong: r.grade !== 'low', dim: r.grade === 'low' })}
                      {cell(`${fmtEok(r.revenueManwon)}억`, { strong: true })}
                      {cell(r.arpuManwon === null ? '—' : `${fmtInt(r.arpuManwon)}만`)}
                      {cell(fmtPct(r.convRate), { bl: true })}
                      {cell(fmtPct(r.lensRate, 0), { bl: true })}
                      {cell(r.lensCostManwon > 0 ? `${fmtEok(r.lensCostManwon)}억` : '—', {
                        dim: r.lensCostManwon === 0,
                      })}
                      {cell(r.reop > 0 ? `${fmtInt(r.reop)}건` : '—', { dim: r.reop === 0 })}
                      {cell(r.contribManwon === null ? '—' : `${fmtEok(r.contribManwon)}억`, {
                        bl: true,
                        hl: true,
                        strong: r.contribManwon !== null,
                        dim: r.contribManwon === null,
                      })}
                    </div>
                  ))}

                  {/* 합계 — 인원은 서버의 전체 기준값(채널 합계는 중복된다) */}
                  <div className={`${GRID} items-stretch bg-slate-50/80`}>
                    <div className="flex flex-col justify-center py-2.5 pl-5">
                      <span className="text-[12.5px] font-bold text-slate-900">전체</span>
                      <span className="text-[10.5px] text-slate-600">모든 유입채널</span>
                    </div>
                    {cell(fmtInt(totals.surgeryDone), { strong: true })}
                    {cell(`${fmtEok(totals.revenue)}억`, { strong: true })}
                    {cell(totals.arpu === null ? '—' : `${fmtInt(totals.arpu)}만`, { strong: true })}
                    {cell('—', { bl: true, dim: true })}
                    {cell('—', { bl: true, dim: true })}
                    {cell(totals.lensCost > 0 ? `${fmtEok(totals.lensCost)}억` : '—', { dim: totals.lensCost === 0 })}
                    {cell('—', { dim: true })}
                    {cell(totals.contrib === null ? '—' : `${fmtEok(totals.contrib)}억`, {
                      bl: true, hl: true, strong: totals.contrib !== null, dim: totals.contrib === null,
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2 px-5 pb-4 pt-3">
                <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-slate-600" />
                <span className="text-[11.5px] leading-relaxed text-slate-700">
                  표본 {SAMPLE_LOW}명 미만은 <b>n</b> 을 함께 표시하고, {SAMPLE_LOW}~{SAMPLE_WARN - 1}명은 &lsquo;표본 주의&rsquo;로
                  둡니다 — 렌즈 환자 몇 명이 객단가를 좌우합니다.
                  <b>공헌이익(렌즈만) = 수납액 − 렌즈 매입원가</b> 입니다. 약품·수술재료·결제수수료·건별 인센티브는
                  원가 데이터가 없어 빠져 있으므로 <b>실제 공헌이익보다 높습니다</b> — 절대값이 아니라 채널 간 비교로
                  보세요. 단가가 비어 있는 시술이 있으면 부풀려 보이지 않도록 &lsquo;—&rsquo; 로 둡니다.
                </span>
              </div>
            </>
          )}

          {tab === 'ads' && (
            <div className="flex flex-col gap-4 px-5 pb-5 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-bold text-slate-900">광고매체 효율</span>
                  <span className="text-[11.5px] text-slate-600">
                    비용과 성과의 귀속 근거가 있는 광고상품만 계산합니다. 광고비는 만원 단위입니다.
                  </span>
                </div>
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs"
                  disabled={saveAds.isPending}
                  onClick={() =>
                    saveAds.mutate(
                      adRows.map((a) => ({
                        ym: queryMonth,
                        media: a.media,
                        amountManwon: adValue(a.media, a.adManwon),
                      })),
                      // 저장되면 초안을 비운다 — 이후로는 서버 값을 그대로 읽는다.
                      { onSuccess: () => setAdEdits({}) },
                    )
                  }
                >
                  {saveAds.isPending ? '저장 중…' : saveAds.isSuccess ? '저장됨 ✓' : '광고비 저장'}
                </Button>
              </div>

              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[1080px] border-collapse text-[12.5px]">
                  <thead>
                    <tr className="border-y border-border/50 bg-slate-50/60 text-[11.5px] font-semibold text-slate-600">
                      <th className="px-4 py-2 text-left">매체·상품</th>
                      <th className="px-4 py-2 text-left">성과 귀속</th>
                      <th className="border-l border-border/50 px-4 py-2 text-right">예약</th>
                      <th className="px-4 py-2 text-right">수술완료</th>
                      <th className="px-4 py-2 text-right">전환율</th>
                      <th className="border-l border-border/50 px-4 py-2 text-right">광고비(만원)</th>
                      <th className="px-4 py-2 text-right">예약 CPA</th>
                      <th className="px-4 py-2 text-right">수술 CPA</th>
                      <th className="px-4 py-2 text-right">매출 ROAS</th>
                      <th className="bg-slate-100/70 px-4 py-2 text-right">공헌이익 ROAS<br /><span className="text-[10px] font-medium text-slate-500">(렌즈만)</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {adRows.map((a) => {
                      const blocked = a.blockedReason !== null
                      const num = (v: string) => (
                        <td className="px-4 py-3 text-right tabular-nums text-slate-800">{v}</td>
                      )
                      return (
                        <tr key={a.media} className={`border-b border-border/40 ${blocked ? 'bg-amber-50/40' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <span
                                className="flex h-7 w-7 flex-none items-center justify-center rounded-lg text-[13px] font-extrabold text-white"
                                style={{ background: a.badge === 'N' ? '#03C75A' : '#8B5CF6' }}
                              >
                                {a.badge}
                              </span>
                              <div className="flex flex-col">
                                <span className="whitespace-nowrap font-bold text-slate-900">{a.label}</span>
                                <span className="whitespace-nowrap text-[10.5px] text-slate-600">{a.sub}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {blocked ? (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-bold text-amber-700">
                                부분 추적
                              </span>
                            ) : (
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-800">{a.channel}</span>
                                <span className="text-[10px] text-slate-600">채널 직접 연결</span>
                              </div>
                            )}
                          </td>
                          <td className="border-l border-border/40 px-4 py-3 text-right tabular-nums text-slate-800">
                            {a.reserved === null ? '—' : `${fmtInt(a.reserved)}명`}
                          </td>
                          {num(a.surgeryDone === null ? '—' : `${fmtInt(a.surgeryDone)}명`)}
                          {num(fmtPct(a.convRate))}
                          <td className="border-l border-border/40 px-4 py-3 text-right">
                            <input
                              type="number"
                              min={0}
                              step={100}
                              aria-label={`${a.label} 광고비`}
                              value={adValue(a.media, a.adManwon)}
                              onChange={(e) =>
                                setAdEdits((d) => ({
                                  ...d,
                                  [adKey(a.media)]: Math.max(0, Number(e.target.value) || 0),
                                }))
                              }
                              className="h-8 w-24 rounded-md border border-border/70 px-2 text-right text-[12px] font-bold tabular-nums"
                            />
                          </td>
                          {num(a.cpaReserved === null ? '—' : `${a.cpaReserved.toFixed(1)}만`)}
                          {num(a.cpaSurgery === null ? '—' : `${a.cpaSurgery.toFixed(1)}만`)}
                          {num(fmtRatio(a.revenueRoas))}
                          <td
                            className={`bg-slate-50 px-4 py-3 text-right font-bold tabular-nums ${
                              a.contribRoas === null ? 'text-slate-400'
                              : a.contribRoas >= 1 ? 'text-emerald-600' : 'text-red-600'
                            }`}
                          >
                            {fmtRatio(a.contribRoas)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* 귀속 불가 사유 — 표에서 '—' 만 보면 왜 비었는지 알 수 없다 */}
              {adRows.filter((a) => a.blockedReason).map((a) => (
                <div key={a.media} className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-amber-600" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[12.5px] font-bold text-amber-900">{a.label}는 ROAS 산출 보류</span>
                    <span className="text-[11.5px] leading-relaxed text-amber-800">{a.blockedReason}</span>
                  </div>
                </div>
              ))}

              {/* 렌즈 단가 — 공헌이익 ROAS 의 유일한 원가 입력이라 같은 탭에 둔다 */}
              <div className="rounded-lg border border-border/70">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-bold text-slate-900">렌즈 매입 단가</span>
                    <span className="text-[11.5px] text-slate-600">
                      안(眼) 1개당 만원. 양안이면 2개가 나갑니다. T- 는 난시교정이라 단가가 다릅니다.
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 text-xs"
                    disabled={savePrices.isPending}
                    onClick={() =>
                      savePrices.mutate(
                        prices.rows.map((p) => ({
                          opType: p.opType,
                          unitCostManwon: priceValue(p.opType, p.unitCostManwon),
                        })),
                        { onSuccess: () => setPriceEdits({}) },
                      )
                    }
                  >
                    {savePrices.isPending ? '저장 중…' : savePrices.isSuccess ? '저장됨 ✓' : '단가 저장'}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-4 px-4 py-3">
                  {prices.rows.map((p) => (
                    <label key={p.opType} className="flex items-center gap-2">
                      <span className="w-14 text-[11.5px] font-semibold text-slate-700">{p.opType}</span>
                      <input
                        type="number"
                        min={0}
                        step={10}
                        aria-label={`${p.opType} 단가`}
                        value={priceValue(p.opType, p.unitCostManwon)}
                        onChange={(e) =>
                          setPriceEdits((d) => ({ ...d, [p.opType]: Math.max(0, Number(e.target.value) || 0) }))
                        }
                        className="h-8 w-20 rounded-md border border-border/70 px-2 text-right text-[12px] font-bold tabular-nums"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-slate-600" />
                <span className="text-[11.5px] leading-relaxed text-slate-700">
                  예약 CPA = 광고비 ÷ 귀속 예약 · 수술 CPA = 광고비 ÷ 귀속 수술완료 · 공헌이익 ROAS = 공헌이익(렌즈만) ÷ 광고비.
                  손익분기는 <b className="text-blue-700">1.0배</b>입니다. 광고비는 저장하면 모든 사용자에게 같은 값이 보입니다.
                </span>
              </div>
            </div>
          )}
        </div>
      </PanelShell>
    </div>
  )
}
