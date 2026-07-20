import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Select } from '@/components/filters/Select'
import type { StopReasonMonthlyItem } from '@/api/consultation'
import { CURRENT_YEAR, MONTHS } from '@/constants/chart'
import { formatAxisNumber } from '@/utils/stats'
import { isIncompleteMonth } from './monthlyReportUtils'

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
type SurgeryCell = {
  lasek: number; lasik: number; smile: number; smilePro: number
  icl: number; tIcl: number; kpl: number; tKpl: number; viva: number
  catMulti: number; catMono: number; catEdof: number
  xtra: number; waveVision: number; monoVision: number; contra: number; personal: number
  reoperation: number
  visionPatients: number; cataractPatients: number; total: number
}

const VISION_COLS: { key: keyof SurgeryCell; label: string }[] = [
  { key: 'lasek', label: '라섹' }, { key: 'lasik', label: '라식' },
  { key: 'smile', label: '스마일' }, { key: 'smilePro', label: '스마일프로' },
  { key: 'icl', label: 'ICL' }, { key: 'tIcl', label: 'T-ICL' },
  { key: 'kpl', label: 'KPL' }, { key: 'tKpl', label: 'T-KPL' }, { key: 'viva', label: 'VIVA' },
]
// 시력교정 부가시술(add-on, 레거시 p.27 순서) + 재수술
const ADDON_COLS: { key: keyof SurgeryCell; label: string }[] = [
  { key: 'xtra', label: '엑스트라' }, { key: 'personal', label: '퍼스널' }, { key: 'contra', label: '콘트라' },
  { key: 'waveVision', label: '웨이브비전' }, { key: 'monoVision', label: '모노비전' },
  { key: 'reoperation', label: '재수술' },
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
  const cell = (v: number) => (v ? formatAxisNumber(v) : '')

  return (
    <Card className="report-chart flex break-inside-avoid flex-col border-border/70 shadow-sm">
      <CardHeader className="items-center pb-2">
        <CardTitle className="text-center text-lg">
          수술 상세<span className="text-sm font-medium text-muted-foreground"> (시술별 · {CURRENT_YEAR}년)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-center text-[11px]">
            <thead>
              <tr className="border-y border-border bg-muted/40">
                <th className="py-1.5">월</th>
                <th className="py-1.5">총수술</th>
                <th className="py-1.5 text-blue-700">시력교정</th>
                {VISION_COLS.map((c) => <th key={c.key} className="py-1.5">{c.label}</th>)}
                {ADDON_COLS.map((c) => <th key={c.key} className="py-1.5 text-emerald-700">{c.label}</th>)}
                <th className="py-1.5 text-violet-700">백내장</th>
                {CATARACT_COLS.map((c) => <th key={c.key} className="py-1.5">{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.month} className="border-b border-border">
                  <td className="py-1.5 font-semibold">{r.month}</td>
                  <td className="py-1.5 font-semibold tabular-nums">{cell(r.cell.total)}</td>
                  <td className="py-1.5 tabular-nums text-blue-700">{cell(r.cell.visionPatients)}</td>
                  {VISION_COLS.map((c) => <td key={c.key} className="py-1.5 tabular-nums">{cell(r.cell[c.key])}</td>)}
                  {ADDON_COLS.map((c) => <td key={c.key} className="py-1.5 tabular-nums text-emerald-700">{cell(r.cell[c.key])}</td>)}
                  <td className="py-1.5 tabular-nums text-violet-700">{cell(r.cell.cataractPatients)}</td>
                  {CATARACT_COLS.map((c) => <td key={c.key} className="py-1.5 tabular-nums">{cell(r.cell[c.key])}</td>)}
                </tr>
              ))}
              <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                <td className="py-1.5">합계</td>
                <td className="py-1.5 tabular-nums">{cell(sum('total'))}</td>
                <td className="py-1.5 tabular-nums text-blue-700">{cell(sum('visionPatients'))}</td>
                {VISION_COLS.map((c) => <td key={c.key} className="py-1.5 tabular-nums">{cell(sum(c.key))}</td>)}
                {ADDON_COLS.map((c) => <td key={c.key} className="py-1.5 tabular-nums text-emerald-700">{cell(sum(c.key))}</td>)}
                <td className="py-1.5 tabular-nums text-violet-700">{cell(sum('cataractPatients'))}</td>
                {CATARACT_COLS.map((c) => <td key={c.key} className="py-1.5 tabular-nums">{cell(sum(c.key))}</td>)}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          ※ 운영 DB 라이브(시술별). 엑스트라·웨이브비전·모노비전은 시력교정 부가시술(환자 수 기준),
          재수술은 RE_OPERATION 레코드(건) 단위(레거시 월간보고와 ±1 일치). 재수술 레이저/렌즈 세부 분류는 팀장 검증 예정(Phase 2).
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
                      return <td key={i} className="py-1.5 tabular-nums">{typeof v === 'number' ? pct(v) : ''}</td>
                    })}
                    <td className="py-1.5 font-semibold tabular-nums">{typeof a === 'number' ? pct(a) : ''}</td>
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
