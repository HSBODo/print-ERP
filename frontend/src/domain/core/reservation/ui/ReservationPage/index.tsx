import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'

import {
  CHART_COLORS,
  MONTHS,
  YEAR_STROKE_PATTERNS,
} from '#shared/constants/chart'
import { useIsMobile } from '#shared/hooks/useIsMobile'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#shared/ui/Card'
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '#shared/ui/Chart'
import { FilterBar } from '#shared/ui/FilterBar'
import {
  type FilterBarControls,
  useFilterBar,
} from '#shared/ui/FilterBar/useFilterBar'
import { KpiCard } from '#shared/ui/KpiCard'
import { PanelShell } from '#shared/ui/PanelShell'
import { StatsGrid } from '#shared/ui/StatsGrid'
import { StatsStack } from '#shared/ui/StatsStack'
import {
  changeRate,
  formatAxisNumber,
  formatAxisPercent,
  periodLabel,
} from '#shared/utils/stats'

import { useReservationComposition } from '../../hooks/useReservationComposition'
import { useReservationKpi } from '../../hooks/useReservationKpi'
import { useReservationTrend } from '../../hooks/useReservationTrend'

/* ── 상수 ── */
type MetricKey = 'total' | 'surgery' | 'outpatient' | 'dreamlens'

interface MonthlyData {
  surgery: number
  outpatient: number
  dreamlens: number
}
type WithTotal = MonthlyData & { total: number }

const METRICS = [
  { key: 'total' as const, label: '전체 예약건수' },
  { key: 'surgery' as const, label: '수술 예약수' },
  { key: 'outpatient' as const, label: '외래 예약수' },
  { key: 'dreamlens' as const, label: '드림렌즈 예약수' },
]
const STACK_KEYS: Exclude<MetricKey, 'total'>[] = [
  'surgery',
  'outpatient',
  'dreamlens',
]
const STACK_CONFIG = {
  surgery: { label: '수술', color: 'var(--chart-1)' },
  outpatient: { label: '외래', color: 'var(--chart-3)' },
  dreamlens: { label: '드림렌즈', color: 'var(--chart-4)' },
} satisfies ChartConfig
const COMPOSED_CONFIG = {
  total: { label: '예약 건수', color: 'var(--chart-1)' },
  rate: { label: '증감률 (%)', color: 'var(--chart-3)' },
} satisfies ChartConfig
const DETAIL_METRIC_KEYS: Exclude<MetricKey, 'total'>[] = [
  'surgery',
  'outpatient',
  'dreamlens',
]
const METRIC_COLORS: Record<MetricKey, string> = {
  total: '#334155',
  surgery: 'var(--chart-1)',
  outpatient: 'var(--chart-3)',
  dreamlens: 'var(--chart-4)',
}
const EMPTY: MonthlyData = { surgery: 0, outpatient: 0, dreamlens: 0 }
const getLineStyleLabel = (strokeDasharray?: string) =>
  strokeDasharray ? '점선' : '실선'

function getNiceTickStep(range: number, tickCount: number): number {
  const safeRange = Math.max(range, 1)
  const roughStep = safeRange / Math.max(tickCount - 1, 1)
  const magnitude = 10 ** Math.floor(Math.log10(roughStep))
  const candidates = [1, 2, 2.5, 5, 10].map((value) => value * magnitude)
  return candidates.reduce((closest, candidate) => {
    const currentDistance = Math.abs(candidate - roughStep)
    const closestDistance = Math.abs(closest - roughStep)
    if (currentDistance < closestDistance) return candidate
    if (currentDistance === closestDistance) return Math.min(candidate, closest)
    return closest
  })
}

const withTotal = (d: MonthlyData): WithTotal => ({
  ...d,
  total: d.surgery + d.outpatient + d.dreamlens,
})

/* ── KPI 카드 패널 (kpi 엔드포인트) ── */
function KpiCardsPanel({
  queryYears,
  filter,
}: {
  queryYears: number[]
  filter: FilterBarControls
}) {
  const { data: kpiData, isLoading, isError } = useReservationKpi(queryYears)
  const { mode, periods, years } = filter

  const kpiByYear = useMemo(() => {
    const map: Record<
      number,
      { total: number; surgery: number; outpatient: number; dreamlens: number }
    > = {}
    for (const item of kpiData ?? []) map[item.year] = item
    return map
  }, [kpiData])

  const labels =
    mode === 'month' ? periods.map(periodLabel) : years.map((y) => `${y}년`)

  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-4 md:gap-4">
      {METRICS.map((m) => {
        const values =
          mode === 'month'
            ? periods.map((p) => kpiByYear[p.year]?.[m.key] ?? 0)
            : years.map((y) => kpiByYear[y]?.[m.key] ?? 0)
        return (
          <PanelShell
            key={m.key}
            isLoading={isLoading}
            isError={isError}
            variant="kpi"
          >
            <KpiCard label={m.label} values={values} labels={labels} />
          </PanelShell>
        )
      })}
    </section>
  )
}

/* ── 월별: 유형별 비교 (trend 엔드포인트) ── */
function MonthComparePanel({
  queryYears,
  filter,
}: {
  queryYears: number[]
  filter: FilterBarControls
}) {
  const { dataMap, isLoading, isError } = useReservationTrend(queryYears)
  const { periods } = filter
  const periodsData = useMemo(
    () => periods.map((p) => withTotal(dataMap[p.year]?.[p.month] ?? EMPTY)),
    [periods, dataMap],
  )
  const monthChartConfig = useMemo(() => {
    const cfg: ChartConfig = {}
    periods.forEach((p, i) => {
      cfg[`p${i}`] = { label: periodLabel(p), color: CHART_COLORS[i] }
    })
    return cfg
  }, [periods])
  const monthChartData = useMemo(
    () =>
      METRICS.map((m) => {
        const row: Record<string, string | number> = { name: m.label }
        periodsData.forEach((d, i) => {
          row[`p${i}`] = d[m.key]
        })
        return row
      }),
    [periodsData],
  )

  return (
    <PanelShell isLoading={isLoading} isError={isError} variant="bar">
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>유형별 비교</CardTitle>
          <CardDescription>
            {periods.map(periodLabel).join(' · ')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={monthChartConfig} className="h-72 w-full">
            <BarChart data={monthChartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={formatAxisNumber}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              {periods.map((_, i) => (
                <Bar
                  key={`p${i}`}
                  dataKey={`p${i}`}
                  fill={`var(--color-p${i})`}
                  radius={[4, 4, 0, 0]}
                  barSize={Math.max(16, 56 / periods.length)}
                />
              ))}
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </PanelShell>
  )
}

/* ── 월별: 구성비 (composition 엔드포인트) ── */
function MonthStackPanel({
  queryYears,
  filter,
}: {
  queryYears: number[]
  filter: FilterBarControls
}) {
  const { dataMap, isLoading, isError } = useReservationComposition(queryYears)
  const { periods } = filter
  const periodsData = useMemo(
    () => periods.map((p) => withTotal(dataMap[p.year]?.[p.month] ?? EMPTY)),
    [periods, dataMap],
  )
  const stackedData = useMemo(
    () =>
      periods.map((p, i) => ({
        name: periodLabel(p),
        surgery: periodsData[i].surgery,
        outpatient: periodsData[i].outpatient,
        dreamlens: periodsData[i].dreamlens,
      })),
    [periods, periodsData],
  )

  return (
    <PanelShell isLoading={isLoading} isError={isError} variant="bar">
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>구성비</CardTitle>
          <CardDescription>기간별 수술·외래·드림렌즈 적층</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={STACK_CONFIG} className="h-72 w-full">
            <BarChart data={stackedData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={formatAxisNumber}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="surgery" stackId="s" fill="var(--color-surgery)" />
              <Bar
                dataKey="outpatient"
                stackId="s"
                fill="var(--color-outpatient)"
              />
              <Bar
                dataKey="dreamlens"
                stackId="s"
                fill="var(--color-dreamlens)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </PanelShell>
  )
}

/* ── 월별: 비율 (composition 엔드포인트) ── */
function MonthDonutPanel({
  queryYears,
  filter,
}: {
  queryYears: number[]
  filter: FilterBarControls
}) {
  const { dataMap, isLoading, isError } = useReservationComposition(queryYears)
  const { periods } = filter
  const periodsData = useMemo(
    () => periods.map((p) => withTotal(dataMap[p.year]?.[p.month] ?? EMPTY)),
    [periods, dataMap],
  )
  const donutData = useMemo(
    () =>
      periods.map((p, i) => ({
        label: periodLabel(p),
        slices: STACK_KEYS.map((key) => ({
          name: STACK_CONFIG[key].label,
          value: periodsData[i][key],
          fill: STACK_CONFIG[key].color,
        })),
      })),
    [periods, periodsData],
  )

  return (
    <PanelShell isLoading={isLoading} isError={isError} variant="donut">
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>비율</CardTitle>
          <CardDescription>기간별 예약 유형 비율</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-center justify-center gap-4">
            {STACK_KEYS.map((key) => (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: STACK_CONFIG[key].color }}
                />
                <span className="text-sm text-muted-foreground">
                  {STACK_CONFIG[key].label}
                </span>
              </div>
            ))}
          </div>
          <div
            className={`grid gap-4 ${periods.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}
          >
            {donutData.map((d) => {
              const total = d.slices.reduce((s, item) => s + item.value, 0)
              return (
                <div key={d.label} className="flex flex-col items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    {d.label}
                  </span>
                  <ChartContainer
                    config={STACK_CONFIG}
                    className="mx-auto aspect-square h-40"
                  >
                    <PieChart>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent nameKey="name" hideLabel />
                        }
                      />
                      <Pie
                        data={d.slices}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={32}
                        strokeWidth={2}
                      />
                    </PieChart>
                  </ChartContainer>
                  <div className="w-full space-y-1 px-2">
                    {d.slices.map((slice) => (
                      <div
                        key={slice.name}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: slice.fill }}
                          />
                          <span className="text-muted-foreground">
                            {slice.name}
                          </span>
                        </div>
                        <span className="font-medium tabular-nums text-gray-700">
                          {slice.value.toLocaleString()}{' '}
                          <span className="text-muted-foreground">
                            (
                            {total
                              ? ((slice.value / total) * 100).toFixed(1)
                              : 0}
                            %)
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </PanelShell>
  )
}

/* ── 월별: 건수+증감 (trend 엔드포인트) ── */
function MonthComposedPanel({
  queryYears,
  filter,
}: {
  queryYears: number[]
  filter: FilterBarControls
}) {
  const { dataMap, isLoading, isError } = useReservationTrend(queryYears)
  const { periods } = filter
  const periodsData = useMemo(
    () => periods.map((p) => withTotal(dataMap[p.year]?.[p.month] ?? EMPTY)),
    [periods, dataMap],
  )
  const composedData = useMemo(
    () =>
      periods.map((p, i) => ({
        name: periodLabel(p),
        total: periodsData[i].total,
        rate:
          i === 0
            ? 0
            : Math.round(
                changeRate(periodsData[0].total, periodsData[i].total) * 10,
              ) / 10,
      })),
    [periods, periodsData],
  )

  return (
    <PanelShell isLoading={isLoading} isError={isError} variant="bar">
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>건수 + 증감률</CardTitle>
          <CardDescription>기준 대비 전체 예약 건수와 변화율</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={COMPOSED_CONFIG} className="h-72 w-full">
            <ComposedChart data={composedData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                yAxisId="left"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={formatAxisNumber}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={formatAxisPercent}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                yAxisId="left"
                dataKey="total"
                fill="var(--color-total)"
                radius={[4, 4, 0, 0]}
                barSize={40}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="rate"
                stroke="var(--color-rate)"
                strokeWidth={2.5}
                dot={{ r: 5 }}
                activeDot={{ r: 7 }}
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </PanelShell>
  )
}

/* ── 연도별: 추이 비교 (trend 엔드포인트) ── */
function YearTrendPanel({
  queryYears,
  filter,
}: {
  queryYears: number[]
  filter: FilterBarControls
}) {
  const { dataMap, isLoading, isError } = useReservationTrend(queryYears)
  const { years } = filter
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(['total'])
  const activeMetrics = useMemo(
    () =>
      selectedMetrics.includes('total')
        ? (['total'] as MetricKey[])
        : selectedMetrics,
    [selectedMetrics],
  )

  const yearChartSeries = useMemo(() => {
    if (activeMetrics.includes('total')) {
      return years.map((year, yi) => ({
        key: `y${yi}_total`,
        label: `${year}년 · 전체`,
        color: METRIC_COLORS.total,
        strokeDasharray: YEAR_STROKE_PATTERNS[yi],
      }))
    }
    return years.flatMap((year, yi) =>
      activeMetrics.map((mk) => ({
        key: `y${yi}_${mk}`,
        label: `${year}년 · ${METRICS.find((item) => item.key === mk)?.label ?? mk}`,
        color: METRIC_COLORS[mk],
        strokeDasharray: YEAR_STROKE_PATTERNS[yi],
      })),
    )
  }, [activeMetrics, years])
  const yearLineConfig = useMemo(() => {
    const cfg: ChartConfig = {}
    yearChartSeries.forEach((s) => {
      cfg[s.key] = { label: s.label, color: s.color }
    })
    return cfg
  }, [yearChartSeries])
  const yearChartData = useMemo(
    () =>
      MONTHS.map((month, mi) => {
        const row: Record<string, string | number> = { month }
        years.forEach((y, i) => {
          const d = withTotal(dataMap[y]?.[mi] ?? EMPTY)
          if (activeMetrics.includes('total')) {
            row[`y${i}_total`] = d.total
            return
          }
          activeMetrics.forEach((mk) => {
            row[`y${i}_${mk}`] = d[mk]
          })
        })
        return row
      }),
    [activeMetrics, years, dataMap],
  )
  const yearTrendAxis = useMemo<{
    domain: [number, number]
    ticks: number[]
  }>(() => {
    const values = yearChartSeries
      .flatMap((series) => yearChartData.map((row) => Number(row[series.key])))
      .filter((v) => Number.isFinite(v))
    if (!values.length) return { domain: [0, 100], ticks: [0, 50, 100] }
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min
    const step = getNiceTickStep(range || Math.max(max * 0.2, 1), 6)
    if (min === max) {
      const upper = Math.ceil((max + step) / step) * step
      const lower = Math.max(0, upper - step * 4)
      return {
        domain: [lower, upper],
        ticks: [lower, lower + step, lower + step * 2, lower + step * 3, upper],
      }
    }
    const lower = Math.max(0, Math.floor(min / step) * step)
    const upper = Math.ceil(max / step) * step
    const ticks: number[] = []
    for (let c = lower; c <= upper + step / 2; c += step) ticks.push(c)
    return { domain: [lower, upper], ticks }
  }, [yearChartData, yearChartSeries])

  const toggleMetric = (metricKey: MetricKey) => {
    if (metricKey === 'total') {
      setSelectedMetrics(['total'])
      return
    }
    setSelectedMetrics((current) => {
      const without = current.filter((item) => item !== 'total')
      const next = without.includes(metricKey)
        ? without.filter((item) => item !== metricKey)
        : [...without, metricKey]
      if (!next.length) return ['total']
      return DETAIL_METRIC_KEYS.filter((key) => next.includes(key))
    })
  }

  return (
    <PanelShell isLoading={isLoading} isError={isError} variant="line">
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>추이 비교</CardTitle>
            <div className="flex flex-wrap gap-1 rounded-md bg-gray-100 p-0.5">
              {METRICS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => toggleMetric(m.key)}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${activeMetrics.includes(m.key) ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  style={
                    activeMetrics.includes(m.key)
                      ? { color: METRIC_COLORS[m.key] }
                      : undefined
                  }
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <CardDescription>
            {years.map((y) => `${y}년`).join(' · ')} — 12개월 오버레이
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={yearLineConfig} className="h-72 w-full">
            <LineChart data={yearChartData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={formatAxisNumber}
                domain={yearTrendAxis.domain}
                ticks={yearTrendAxis.ticks}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              {yearChartSeries.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={`var(--color-${s.key})`}
                  strokeWidth={activeMetrics.includes('total') ? 2.75 : 2.25}
                  strokeDasharray={s.strokeDasharray || undefined}
                  dot={yearChartSeries.length <= 4 ? { r: 4 } : false}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ChartContainer>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-gray-600">
            {yearChartSeries.map((series) => (
              <div
                key={series.key}
                className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5"
              >
                <svg
                  aria-hidden="true"
                  className="h-3 w-7 flex-none"
                  viewBox="0 0 28 12"
                >
                  <line
                    x1="1"
                    y1="6"
                    x2="27"
                    y2="6"
                    stroke={series.color}
                    strokeWidth="2.5"
                    strokeDasharray={series.strokeDasharray || undefined}
                    strokeLinecap="round"
                  />
                  <circle
                    cx="14"
                    cy="6"
                    r="2.5"
                    fill="white"
                    stroke={series.color}
                    strokeWidth="2"
                  />
                </svg>
                <span className="font-medium text-gray-700">
                  {series.label}
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                  {getLineStyleLabel(series.strokeDasharray)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PanelShell>
  )
}

/* ── 연도별: 구성비 (composition 엔드포인트) ── */
function YearStackPanel({
  queryYears,
  filter,
}: {
  queryYears: number[]
  filter: FilterBarControls
}) {
  const { dataMap, isLoading, isError } = useReservationComposition(queryYears)
  const { years } = filter
  const yearStackedData = useMemo(
    () =>
      MONTHS.map((month, mi) => {
        const d = dataMap[years[0]]?.[mi] ?? EMPTY
        return {
          month,
          surgery: d.surgery,
          outpatient: d.outpatient,
          dreamlens: d.dreamlens,
        }
      }),
    [years, dataMap],
  )

  return (
    <PanelShell isLoading={isLoading} isError={isError} variant="area">
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>구성비</CardTitle>
          <CardDescription>
            {years[0]}년 수술·외래·드림렌즈 월별 적층
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={STACK_CONFIG} className="h-72 w-full">
            <AreaChart data={yearStackedData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={formatAxisNumber}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <defs>
                {STACK_KEYS.map((key) => (
                  <linearGradient
                    key={key}
                    id={`fill-${key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={STACK_CONFIG[key].color}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={STACK_CONFIG[key].color}
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                ))}
              </defs>
              <Area
                type="monotone"
                dataKey="surgery"
                stackId="1"
                fill="url(#fill-surgery)"
                stroke="var(--color-surgery)"
              />
              <Area
                type="monotone"
                dataKey="outpatient"
                stackId="1"
                fill="url(#fill-outpatient)"
                stroke="var(--color-outpatient)"
              />
              <Area
                type="monotone"
                dataKey="dreamlens"
                stackId="1"
                fill="url(#fill-dreamlens)"
                stroke="var(--color-dreamlens)"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </PanelShell>
  )
}

/* ── 연도별: 건수+증감 (trend 엔드포인트) ── */
function YearComposedPanel({
  queryYears,
  filter,
}: {
  queryYears: number[]
  filter: FilterBarControls
}) {
  const { dataMap, isLoading, isError } = useReservationTrend(queryYears)
  const { years } = filter
  const yearComposedData = useMemo(
    () =>
      MONTHS.map((month, mi) => {
        const base = withTotal(dataMap[years[0]]?.[mi] ?? EMPTY)
        const comp = years[1]
          ? withTotal(dataMap[years[1]]?.[mi] ?? EMPTY)
          : base
        return {
          month,
          total: base.total,
          rate:
            base.total === 0
              ? 0
              : Math.round(changeRate(comp.total, base.total) * 10) / 10,
        }
      }),
    [years, dataMap],
  )

  return (
    <PanelShell isLoading={isLoading} isError={isError} variant="bar">
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>건수 + 증감률</CardTitle>
          <CardDescription>
            {years[0]}년 월별 건수 · {years[1] ?? years[0]}년 대비 증감
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={COMPOSED_CONFIG} className="h-72 w-full">
            <ComposedChart data={yearComposedData}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                yAxisId="left"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={formatAxisNumber}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={formatAxisPercent}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                yAxisId="left"
                dataKey="total"
                fill="var(--color-total)"
                radius={[4, 4, 0, 0]}
                barSize={24}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="rate"
                stroke="var(--color-rate)"
                strokeWidth={2.5}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </PanelShell>
  )
}

/* ── 연도별: 비율 (composition 엔드포인트) ── */
function YearDonutPanel({
  queryYears,
  filter,
}: {
  queryYears: number[]
  filter: FilterBarControls
}) {
  const { dataMap, isLoading, isError } = useReservationComposition(queryYears)
  const { years } = filter
  const yearTotals = useMemo(
    () =>
      years.map((year) => {
        const data = dataMap[year] ?? []
        const summary = {
          surgery: data.reduce((t, i) => t + i.surgery, 0),
          outpatient: data.reduce((t, i) => t + i.outpatient, 0),
          dreamlens: data.reduce((t, i) => t + i.dreamlens, 0),
        }
        return {
          ...summary,
          total: summary.surgery + summary.outpatient + summary.dreamlens,
        }
      }),
    [years, dataMap],
  )

  return (
    <PanelShell isLoading={isLoading} isError={isError} variant="donut">
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>연도별 비율</CardTitle>
          <CardDescription>연간 합산 수술·외래·드림렌즈 비율</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex items-center justify-center gap-4">
            {STACK_KEYS.map((key) => (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: STACK_CONFIG[key].color }}
                />
                <span className="text-sm text-muted-foreground">
                  {STACK_CONFIG[key].label}
                </span>
              </div>
            ))}
          </div>
          <div
            className={`grid gap-4 ${years.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}
          >
            {years.map((y, yi) => {
              const slices = STACK_KEYS.map((key) => ({
                name: STACK_CONFIG[key].label,
                value: yearTotals[yi][key],
                fill: STACK_CONFIG[key].color,
              }))
              const total = slices.reduce((s, item) => s + item.value, 0)
              return (
                <div key={y} className="flex flex-col items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    {y}년
                  </span>
                  <ChartContainer
                    config={STACK_CONFIG}
                    className="mx-auto aspect-square h-40"
                  >
                    <PieChart>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent nameKey="name" hideLabel />
                        }
                      />
                      <Pie
                        data={slices}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={32}
                        strokeWidth={2}
                      />
                    </PieChart>
                  </ChartContainer>
                  <div className="w-full space-y-1 px-2">
                    {slices.map((slice) => (
                      <div
                        key={slice.name}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: slice.fill }}
                          />
                          <span className="text-muted-foreground">
                            {slice.name}
                          </span>
                        </div>
                        <span className="font-medium tabular-nums text-gray-700">
                          {slice.value.toLocaleString()}{' '}
                          <span className="text-muted-foreground">
                            (
                            {total
                              ? ((slice.value / total) * 100).toFixed(1)
                              : 0}
                            %)
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </PanelShell>
  )
}

/* ── 메인 ── */
export function ReservationPage() {
  const filter = useFilterBar()
  const { mode, periods, years } = filter
  const isMobile = useIsMobile()

  const queryYears = useMemo(() => {
    const set = new Set<number>()
    if (mode === 'month') periods.forEach((p) => set.add(p.year))
    else years.forEach((y) => set.add(y))
    return [...set].sort()
  }, [mode, periods, years])

  const kpi = <KpiCardsPanel queryYears={queryYears} filter={filter} />
  const charts =
    mode === 'month' ? (
      <>
        <MonthComparePanel queryYears={queryYears} filter={filter} />
        <MonthStackPanel queryYears={queryYears} filter={filter} />
        <MonthDonutPanel queryYears={queryYears} filter={filter} />
        <MonthComposedPanel queryYears={queryYears} filter={filter} />
      </>
    ) : (
      <>
        <YearTrendPanel queryYears={queryYears} filter={filter} />
        <YearStackPanel queryYears={queryYears} filter={filter} />
        <YearComposedPanel queryYears={queryYears} filter={filter} />
        <YearDonutPanel queryYears={queryYears} filter={filter} />
      </>
    )

  const Layout = isMobile ? StatsStack : StatsGrid

  return (
    <div className="space-y-6">
      <FilterBar {...filter} />
      <Layout>
        {kpi}
        <section
          className={
            isMobile ? 'space-y-4' : 'grid grid-cols-1 gap-6 xl:grid-cols-2'
          }
        >
          {charts}
        </section>
      </Layout>
    </div>
  )
}
