import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '#shared/ui/Card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '#shared/ui/Chart'
import { Select } from '#shared/ui/Select'
import type { StopReasonMonthlyItem } from '#domain/core/consultation/type/api'
import { CURRENT_YEAR, MONTHS } from '#shared/constants/chart'
import { formatAxisNumber } from '#shared/utils/stats'
import { isIncompleteMonth } from '../../utils/monthlyReportUtils'

const MONTH_SELECT_OPTIONS = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1}월` }))

/** 월간 레포트 전용 차트/표 서브컴포넌트. 공통 상수/로직은 monthlyReportUtils.ts. */

/* ── 중단 사유 (막대, 최신월) ── */
const SUSPEND_COLOR = '#93C5FD'
const IMPOSSIBLE_COLOR = '#2563EB'
const TOTAL_COLOR = '#1E3A8A'

const REASONS: { key: keyof StopReasonMonthlyItem; label: string; color: string }[] = [
  { key: 'other', label: '기타', color: SUSPEND_COLOR },
  { key: 'glaucoma', label: '불가-녹내장', color: SUSPEND_COLOR },
  { key: 'visionChange', label: '불가-시력변화', color: SUSPEND_COLOR },
  { key: 'recommendX', label: '불가-수술권유X', color: IMPOSSIBLE_COLOR },
  { key: 'lensImpossible', label: '불가-렌즈삽입불가', color: IMPOSSIBLE_COLOR },
  { key: 'keratoconus', label: '불가-원추각막', color: IMPOSSIBLE_COLOR },
  { key: 'avellino', label: '불가-아벨리노', color: IMPOSSIBLE_COLOR },
]

const stopReasonConfig: ChartConfig = { value: { label: '건수', color: IMPOSSIBLE_COLOR } }

export function StopReasonBar({
  year,
  items,
  month,
  onMonthChange,
}: {
  year: number
  items: (StopReasonMonthlyItem | null)[]
  month: number
  onMonthChange: (m: number) => void
}) {
  const item = items[month - 1] ?? null
  const monthLabel = `${year}년 ${month}월`

  const chartData = useMemo(() => {
    const rows = REASONS.map((r) => ({
      name: r.label,
      value: item ? (item[r.key] as number) : 0,
      color: r.color,
    }))
    rows.push({ name: '월 중단합계', value: item?.total ?? 0, color: TOTAL_COLOR })
    return rows
  }, [item])

  return (
    <Card className="report-chart flex break-inside-avoid flex-col border-border/70 shadow-sm">
      <CardHeader className="relative items-center pb-2">
        <CardTitle className="text-center text-lg">
          중단 사유<span className="text-sm font-medium text-muted-foreground"> ({monthLabel})</span>
        </CardTitle>
        <div className="report-no-print absolute right-4 top-3">
          <Select value={month} onChange={onMonthChange} options={MONTH_SELECT_OPTIONS} title="월 선택" />
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={stopReasonConfig} className="report-chart-area aspect-auto h-[480px] w-full">
          <BarChart data={chartData} margin={{ top: 28, left: 0, right: 16, bottom: 24 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" interval={0} tickLine={false} axisLine={false} tickMargin={8} height={60} tick={{ fontSize: 11 }} />
            <YAxis width={40} allowDecimals={false} tickLine={false} axisLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              <LabelList dataKey="value" position="top" className="fill-foreground" fontSize={13} fontWeight={700} />
              {chartData.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

/* ── 수술 상세표 (시술별, 라이브) ── */
// 뒤늦게 추가된 지표(V33 프레스비욘드·PIOL 실인원, 라섹 세부, 재수술 분해)는
// API 스키마에서 optional 이다 — 과거 캐시/시드에 값이 없을 수 있어서다. 여기서도 optional 로 맞춘다.
type SurgeryCell = {
  lasek: number; lasik: number; smile: number; smilePro: number
  icl: number; tIcl: number; kpl: number; tKpl: number; viva: number
  catMulti: number; catMono: number; catEdof: number
  xtra: number; waveVision: number; monoVision: number; contra: number; personal: number
  reoperation: number
  visionPatients: number; cataractPatients: number; total: number
  lasekEx?: number; lasekRed?: number; presbyond?: number; piolPatients?: number
  reopLaser?: number; reopLens?: number
}

// 레거시 월간보고 p.27 의 항목을 모두 싣는다 — 대조할 때 빠진 칸이 없어야 한다.
//   라섹 EX/RED : 라섹의 하위 구분이라 라섹 바로 뒤
//   프레스비욘드 : 노안 레이저. 종전에는 other 로 떨어져 표에 없었다(V33 에서 분류 신설)
//   PIOL 실인원  : 양안에 다른 렌즈를 넣은 환자를 유형마다 세면 합이 실인원보다 커진다.
//                  ICL~VIVA 5종은 대표유형 기준이라 그 합 = 이 값이 된다(같아야 한다).
const VISION_COLS: { key: keyof SurgeryCell; label: string }[] = [
  { key: 'lasek', label: '라섹' }, { key: 'lasekEx', label: '라섹EX' }, { key: 'lasekRed', label: '라섹RED' },
  { key: 'lasik', label: '라식' },
  { key: 'smile', label: '스마일' }, { key: 'smilePro', label: '스마일프로' },
  { key: 'presbyond', label: '프레스비욘드' },
  { key: 'piolPatients', label: 'PIOL' },
  { key: 'icl', label: 'ICL' }, { key: 'tIcl', label: 'T-ICL' },
  { key: 'kpl', label: 'KPL' }, { key: 'tKpl', label: 'T-KPL' }, { key: 'viva', label: 'VIVA' },
]
// 시력교정 부가시술(add-on, 레거시 p.27 순서) + 재수술(합계·레이저·렌즈)
const ADDON_COLS: { key: keyof SurgeryCell; label: string }[] = [
  { key: 'xtra', label: '엑스트라' }, { key: 'personal', label: '퍼스널' }, { key: 'contra', label: '콘트라' },
  { key: 'waveVision', label: '웨이브비전' }, { key: 'monoVision', label: '모노비전' },
  { key: 'reoperation', label: '재수술' },
  { key: 'reopLaser', label: '재수술레이저' }, { key: 'reopLens', label: '재수술렌즈' },
]
const CATARACT_COLS: { key: keyof SurgeryCell; label: string }[] = [
  { key: 'catMulti', label: '다초점' }, { key: 'catMono', label: '단초점' }, { key: 'catEdof', label: 'EDOF' },
]

export function ReportSurgeryTable({ dataMap }: { dataMap: Record<number, SurgeryCell[]> }) {
  const rows = useMemo(() => {
    const arr = dataMap[CURRENT_YEAR] ?? []
    return arr
      .map((cell, i) => ({ month: MONTHS[i], i, cell }))
      .filter((r) => !isIncompleteMonth(CURRENT_YEAR, r.i) && r.cell && r.cell.total > 0)
  }, [dataMap])

  if (!rows.length) return null
  const sum = (key: keyof SurgeryCell) => rows.reduce((s, r) => s + (r.cell[key] || 0), 0)
  const cell = (v: number | undefined) => (v ? formatAxisNumber(v) : '')

  return (
    <Card className="report-chart flex break-inside-avoid flex-col border-border/70 shadow-sm">
      <CardHeader className="items-center pb-2">
        <CardTitle className="text-center text-lg">
          수술 상세<span className="text-sm font-medium text-muted-foreground"> (시술별 · {CURRENT_YEAR}년)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* table-fixed + w-full 이면 칸이 눌려 머리글이 '스마일프/로' 처럼 깨진다.
            칸이 24개라 내용 너비대로 두고 부모가 가로 스크롤하게 한다. */}
        <div className="overflow-x-auto">
          <table className="w-max min-w-full border-collapse text-center text-[11px]">
            <thead>
              <tr className="border-y border-border bg-muted/40">
                <th className="whitespace-nowrap px-2 py-1.5">월</th>
                <th className="whitespace-nowrap px-2 py-1.5">총수술</th>
                <th className="whitespace-nowrap px-2 py-1.5 text-blue-700">시력교정</th>
                {VISION_COLS.map((c) => <th key={c.key} className="whitespace-nowrap px-2 py-1.5">{c.label}</th>)}
                {ADDON_COLS.map((c) => <th key={c.key} className="whitespace-nowrap px-2 py-1.5 text-emerald-700">{c.label}</th>)}
                <th className="whitespace-nowrap px-2 py-1.5 text-violet-700">백내장</th>
                {CATARACT_COLS.map((c) => <th key={c.key} className="whitespace-nowrap px-2 py-1.5">{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.month} className="border-b border-border">
                  <td className="whitespace-nowrap px-2 py-1.5 font-semibold">{r.month}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 font-semibold tabular-nums">{cell(r.cell.total)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-blue-700">{cell(r.cell.visionPatients)}</td>
                  {VISION_COLS.map((c) => <td key={c.key} className="whitespace-nowrap px-2 py-1.5 tabular-nums">{cell(r.cell[c.key])}</td>)}
                  {ADDON_COLS.map((c) => <td key={c.key} className="whitespace-nowrap px-2 py-1.5 tabular-nums text-emerald-700">{cell(r.cell[c.key])}</td>)}
                  <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-violet-700">{cell(r.cell.cataractPatients)}</td>
                  {CATARACT_COLS.map((c) => <td key={c.key} className="whitespace-nowrap px-2 py-1.5 tabular-nums">{cell(r.cell[c.key])}</td>)}
                </tr>
              ))}
              <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                <td className="whitespace-nowrap px-2 py-1.5">합계</td>
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{cell(sum('total'))}</td>
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-blue-700">{cell(sum('visionPatients'))}</td>
                {VISION_COLS.map((c) => <td key={c.key} className="whitespace-nowrap px-2 py-1.5 tabular-nums">{cell(sum(c.key))}</td>)}
                {ADDON_COLS.map((c) => <td key={c.key} className="whitespace-nowrap px-2 py-1.5 tabular-nums text-emerald-700">{cell(sum(c.key))}</td>)}
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-violet-700">{cell(sum('cataractPatients'))}</td>
                {CATARACT_COLS.map((c) => <td key={c.key} className="whitespace-nowrap px-2 py-1.5 tabular-nums">{cell(sum(c.key))}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          ※ 전체 수술 뷰(v_all_surgery_list) 기준 — 수술자 리스트·수술 건수·주차 레포트와 같은 정의다.
          엑스트라·웨이브비전·모노비전은 시력교정 부가시술(환자 수 기준), 재수술은 RE_OPERATION 레코드(건) 단위.
          PIOL 은 실인원 — 양안에 다른 렌즈를 넣은 환자를 유형마다 세지 않으므로 ICL~VIVA 5종의 합과 같다.
          시력교정은 사람, 백내장은 <b>안(눈)</b> 단위라 단위가 다르다. 2026-01~05 는 확정값(골든)이다.
        </p>
      </CardContent>
    </Card>
  )
}

/* ── 시력교정 상담성공률 — 전체/원데이/일반 3계열 (당해연도, 라이브) ── */
// pos = 차트 라벨 위치(라인이 겹치지 않게: 상단 원데이↑ / 중간 전체↓ / 하단 일반↓)
const SUCCESS_SERIES: { key: 'all' | 'oneday' | 'general'; label: string; color: string; pos: 'top' | 'bottom' }[] = [
  { key: 'all', label: '전체 성공률', color: '#E11D2E', pos: 'bottom' },
  { key: 'oneday', label: '원데이', color: '#7CB342', pos: 'top' },
  { key: 'general', label: '일반', color: '#5B9BD5', pos: 'bottom' },
]
const successChartConfig: ChartConfig = {
  all: { label: '전체 성공률', color: '#E11D2E' },
  oneday: { label: '원데이', color: '#7CB342' },
  general: { label: '일반', color: '#5B9BD5' },
}

export function ReportSuccessRateChart({
  year, all, oneday, general,
}: { year: number; all: (number | null)[]; oneday: (number | null)[]; general: (number | null)[] }) {
  const series = { all, oneday, general }
  const chartData = MONTHS.map((month, i) => ({ month, all: all[i], oneday: oneday[i], general: general[i] }))
  const pct = (v: number) => `${Math.round(v)}%`
  const avg = (vals: (number | null)[]) => {
    const nums = vals.filter((v): v is number => typeof v === 'number')
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
  }

  return (
    <Card className="report-chart flex break-inside-avoid flex-col border-border/70 shadow-sm">
      <CardHeader className="items-center gap-1 pb-2">
        <CardTitle className="text-center text-lg">
          시력교정 상담성공률
          <span className="text-sm font-medium text-muted-foreground"> (검사중단/수술불가 제외 · {year}년)</span>
        </CardTitle>
        <div className="flex flex-wrap items-center justify-center gap-5 pt-1">
          {SUCCESS_SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-sm font-bold" style={{ color: s.color }}>
              <span className="h-[3px] w-7 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ChartContainer config={successChartConfig} className="report-chart-area aspect-auto h-[480px] w-full">
          <LineChart data={chartData} margin={{ top: 24, left: 0, right: 80 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" scale="band" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis width={80} tickLine={false} axisLine={false} tickMargin={6}
              domain={[50, 100]} ticks={[50, 60, 70, 80, 90, 100]} allowDecimals={false}
              tickFormatter={(v) => pct(Number(v))} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {SUCCESS_SERIES.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2.5}
                dot={false} connectNulls={false} activeDot={{ r: 4 }}>
                <LabelList dataKey={s.key} position={s.pos} offset={10} fontSize={12} fontWeight={700}
                  fill={s.color} formatter={(v) => (typeof v === 'number' ? pct(v) : '')} />
              </Line>
            ))}
          </LineChart>
        </ChartContainer>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] table-fixed border-collapse text-center text-xs">
            <colgroup><col className="w-20" />{MONTHS.map((m) => <col key={m} />)}<col className="w-20" /></colgroup>
            <thead>
              <tr className="border-y border-border bg-muted/40">
                <th className="py-1.5" />
                {MONTHS.map((m) => <th key={m} className="py-1.5 font-semibold text-foreground">{m}</th>)}
                <th className="py-1.5 font-semibold text-foreground">평균</th>
              </tr>
            </thead>
            <tbody>
              {SUCCESS_SERIES.map((s) => {
                const a = avg(series[s.key])
                return (
                  <tr key={s.key} className="border-b border-border">
                    <td className="py-1.5 font-semibold" style={{ color: s.color }}>{s.label}</td>
                    {MONTHS.map((_, i) => {
                      const v = series[s.key][i]
                      return <td key={i} className="whitespace-nowrap px-2 py-1.5 tabular-nums">{typeof v === 'number' ? pct(v) : ''}</td>
                    })}
                    <td className="whitespace-nowrap px-2 py-1.5 font-semibold tabular-nums">{typeof a === 'number' ? pct(a) : ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          ※ 운영 DB 라이브. 성공률 = 수술예약 / 상담(검사중단·수술불가 제외). 전체·원데이는 레거시와 ±1~2%p,
          일반은 3월 등 일부 월 ~5%p 차(레거시 일반 산정 시점차).
        </p>
      </CardContent>
    </Card>
  )
}

/* ── 고객분류별 검사수 — 내원동기(레포트) 9계열 (당해연도, 라이브) ── */
// 색은 전체 검사자 리스트의 내원동기(레포트) 뱃지 색과 맞춰 두 화면을 같은 색으로 읽게 한다.
// 9계열이라 라인 위 숫자 라벨은 달지 않는다 — 값은 아래 표에서 읽는다.
const EXAM_CLASS_SERIES: { key: string; color: string }[] = [
  { key: '소개고객', color: '#10B981' },
  { key: '소개직원', color: '#8B5CF6' },
  { key: 'B2B(군인)', color: '#6366F1' },
  { key: 'B2B(기업)', color: '#3B82F6' },
  { key: '광고', color: '#F59E0B' },
  { key: '홈페이지', color: '#0EA5E9' },
  { key: '바이럴', color: '#EC4899' },
  { key: '프로모션', color: '#F97316' },
  { key: '기타', color: '#6B7280' },
]

const examClassChartConfig: ChartConfig = Object.fromEntries(
  EXAM_CLASS_SERIES.map((s) => [s.key, { label: s.key, color: s.color }]),
)

export function ReportExamByClassChart({
  year,
  rows,
}: {
  year: number
  rows: { month: number; motiveReport: string; cnt: number }[]
}) {
  // (월 → 분류 → 건수). 응답에 없는 조합은 0, 미래·데이터 없는 월은 null(선 끊김).
  const { chartData, monthTotals } = useMemo(() => {
    const byMonth = new Map<number, Map<string, number>>()
    for (const r of rows) {
      const m = byMonth.get(r.month) ?? new Map<string, number>()
      m.set(r.motiveReport, (m.get(r.motiveReport) ?? 0) + r.cnt)
      byMonth.set(r.month, m)
    }
    const data = MONTHS.map((month, i) => {
      const found = byMonth.get(i + 1)
      const row: Record<string, string | number | null> = { month }
      for (const s of EXAM_CLASS_SERIES) row[s.key] = found ? (found.get(s.key) ?? 0) : null
      return row
    })
    const totals = MONTHS.map((_, i) => {
      const found = byMonth.get(i + 1)
      if (!found) return null
      return [...found.values()].reduce((a, b) => a + b, 0)
    })
    return { chartData: data, monthTotals: totals }
  }, [rows])

  if (!rows.length) return null

  const seriesTotal = (key: string) =>
    chartData.reduce((sum, row) => sum + (typeof row[key] === 'number' ? (row[key] as number) : 0), 0)
  const cell = (v: number | null) => (typeof v === 'number' ? formatAxisNumber(v) : '')

  return (
    <Card className="report-chart flex break-inside-avoid flex-col border-border/70 shadow-sm">
      <CardHeader className="items-center gap-1 pb-2">
        <CardTitle className="text-center text-lg">
          고객분류별 검사수
          <span className="text-sm font-medium text-muted-foreground"> (내원동기 기준 · {year}년)</span>
        </CardTitle>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-1">
          {EXAM_CLASS_SERIES.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: s.color }}>
              <span className="h-[3px] w-6 rounded-full" style={{ backgroundColor: s.color }} />
              {s.key}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ChartContainer config={examClassChartConfig} className="report-chart-area aspect-auto h-[480px] w-full">
          <LineChart data={chartData} margin={{ top: 24, left: 0, right: 24 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" scale="band" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis width={56} allowDecimals={false} tickLine={false} axisLine={false} tickMargin={6}
              tickFormatter={(v) => formatAxisNumber(Number(v))} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {EXAM_CLASS_SERIES.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2.5}
                dot={false} connectNulls={false} activeDot={{ r: 4 }} />
            ))}
          </LineChart>
        </ChartContainer>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] table-fixed border-collapse text-center text-xs">
            <colgroup><col className="w-24" />{MONTHS.map((m) => <col key={m} />)}<col className="w-20" /></colgroup>
            <thead>
              <tr className="border-y border-border bg-muted/40">
                <th className="py-1.5" />
                {MONTHS.map((m) => <th key={m} className="py-1.5 pr-2 text-right font-semibold text-foreground">{m}</th>)}
                <th className="py-1.5 pr-2 text-right font-semibold text-foreground">합계</th>
              </tr>
            </thead>
            <tbody>
              {EXAM_CLASS_SERIES.map((s) => (
                <tr key={s.key} className="border-b border-border">
                  <td className="py-1.5 text-left font-semibold" style={{ color: s.color }}>{s.key}</td>
                  {chartData.map((row, i) => (
                    <td key={i} className="py-1.5 pr-2 text-right tabular-nums">{cell(row[s.key] as number | null)}</td>
                  ))}
                  <td className="py-1.5 pr-2 text-right font-semibold tabular-nums">{formatAxisNumber(seriesTotal(s.key))}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                <td className="py-1.5 text-left">합계</td>
                {monthTotals.map((v, i) => <td key={i} className="py-1.5 pr-2 text-right tabular-nums">{cell(v)}</td>)}
                <td className="py-1.5 pr-2 text-right tabular-nums">
                  {formatAxisNumber(monthTotals.reduce((a: number, b) => a + (b ?? 0), 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

/** 월간 레포트 로딩 스켈레톤 — 차트 카드(제목·범례·차트영역·표) 모양을 펄스로 표시 */
export function ReportChartSkeleton() {
  return (
    <Card className="report-chart flex break-inside-avoid flex-col border-border/70 shadow-sm">
      <CardHeader className="items-center gap-2 pb-2">
        <div className="h-5 w-44 animate-pulse rounded bg-muted" />
        <div className="flex gap-5 pt-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-3 w-12 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex h-[480px] flex-col justify-between py-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-px w-full animate-pulse rounded bg-muted" />
          ))}
        </div>
        <div className="space-y-2 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 w-full animate-pulse rounded bg-muted" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
