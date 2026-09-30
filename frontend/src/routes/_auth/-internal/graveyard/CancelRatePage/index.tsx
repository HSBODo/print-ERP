import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
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
import { useFilterBar } from '#shared/ui/FilterBar/useFilterBar'
import {
  changeRate,
  formatAxisNumber,
  formatAxisPercent,
  type Period,
  periodLabel,
} from '#shared/utils/stats'

/* ── 상수 ── */
type CancelKey =
  | 'total'
  | 'outpatient'
  | 'exam'
  | 'surgery'
  | 'cataractExam'
  | 'cataractOutpatient'

interface MonthlyCancel {
  outpatient: number
  exam: number
  surgery: number
  cataractExam: number
  cataractOutpatient: number
}
type WithTotal = MonthlyCancel & { total: number }

const METRICS: { key: CancelKey; label: string }[] = [
  { key: 'total', label: '전체 취소' },
  { key: 'outpatient', label: '외래취소' },
  { key: 'exam', label: '검사취소' },
  { key: 'surgery', label: '수술취소' },
  { key: 'cataractExam', label: '백내장검사취소' },
  { key: 'cataractOutpatient', label: '백내장외래취소' },
]

const DETAIL_KEYS: Exclude<CancelKey, 'total'>[] = [
  'outpatient',
  'exam',
  'surgery',
  'cataractExam',
  'cataractOutpatient',
]

const STACK_CONFIG = {
  outpatient: { label: '외래', color: 'var(--chart-1)' },
  exam: { label: '검사', color: 'var(--chart-2)' },
  surgery: { label: '수술', color: 'var(--chart-3)' },
  cataractExam: { label: '백내장검사', color: 'var(--chart-4)' },
  cataractOutpatient: { label: '백내장외래', color: 'var(--chart-5)' },
} satisfies ChartConfig

const COMPOSED_CONFIG = {
  total: { label: '취소 건수', color: 'var(--chart-1)' },
  rate: { label: '증감률 (%)', color: 'var(--chart-3)' },
} satisfies ChartConfig

const METRIC_COLORS: Record<CancelKey, string> = {
  total: '#334155',
  outpatient: 'var(--chart-1)',
  exam: 'var(--chart-2)',
  surgery: 'var(--chart-3)',
  cataractExam: 'var(--chart-4)',
  cataractOutpatient: 'var(--chart-5)',
}

/* ── Mock 데이터 ── */
const mockData: Record<number, MonthlyCancel[]> = {
  2025: [
    {
      outpatient: 18,
      exam: 12,
      surgery: 5,
      cataractExam: 3,
      cataractOutpatient: 2,
    },
    {
      outpatient: 22,
      exam: 14,
      surgery: 6,
      cataractExam: 4,
      cataractOutpatient: 3,
    },
    {
      outpatient: 20,
      exam: 11,
      surgery: 4,
      cataractExam: 3,
      cataractOutpatient: 2,
    },
    {
      outpatient: 25,
      exam: 16,
      surgery: 7,
      cataractExam: 5,
      cataractOutpatient: 4,
    },
    {
      outpatient: 19,
      exam: 13,
      surgery: 5,
      cataractExam: 4,
      cataractOutpatient: 3,
    },
    {
      outpatient: 28,
      exam: 18,
      surgery: 8,
      cataractExam: 6,
      cataractOutpatient: 4,
    },
    {
      outpatient: 30,
      exam: 20,
      surgery: 9,
      cataractExam: 7,
      cataractOutpatient: 5,
    },
    {
      outpatient: 27,
      exam: 17,
      surgery: 7,
      cataractExam: 5,
      cataractOutpatient: 4,
    },
    {
      outpatient: 32,
      exam: 21,
      surgery: 10,
      cataractExam: 8,
      cataractOutpatient: 6,
    },
    {
      outpatient: 35,
      exam: 23,
      surgery: 11,
      cataractExam: 9,
      cataractOutpatient: 7,
    },
    {
      outpatient: 33,
      exam: 22,
      surgery: 10,
      cataractExam: 8,
      cataractOutpatient: 6,
    },
    {
      outpatient: 38,
      exam: 25,
      surgery: 12,
      cataractExam: 10,
      cataractOutpatient: 8,
    },
  ],
  2026: [
    {
      outpatient: 24,
      exam: 15,
      surgery: 6,
      cataractExam: 4,
      cataractOutpatient: 3,
    },
    {
      outpatient: 28,
      exam: 18,
      surgery: 8,
      cataractExam: 5,
      cataractOutpatient: 4,
    },
    {
      outpatient: 22,
      exam: 13,
      surgery: 5,
      cataractExam: 3,
      cataractOutpatient: 2,
    },
    {
      outpatient: 30,
      exam: 20,
      surgery: 9,
      cataractExam: 6,
      cataractOutpatient: 5,
    },
    {
      outpatient: 26,
      exam: 16,
      surgery: 7,
      cataractExam: 4,
      cataractOutpatient: 3,
    },
    {
      outpatient: 32,
      exam: 21,
      surgery: 10,
      cataractExam: 7,
      cataractOutpatient: 5,
    },
    {
      outpatient: 35,
      exam: 23,
      surgery: 11,
      cataractExam: 8,
      cataractOutpatient: 6,
    },
    {
      outpatient: 33,
      exam: 22,
      surgery: 10,
      cataractExam: 7,
      cataractOutpatient: 5,
    },
    {
      outpatient: 37,
      exam: 24,
      surgery: 12,
      cataractExam: 9,
      cataractOutpatient: 7,
    },
    {
      outpatient: 40,
      exam: 26,
      surgery: 13,
      cataractExam: 10,
      cataractOutpatient: 8,
    },
    {
      outpatient: 38,
      exam: 25,
      surgery: 12,
      cataractExam: 9,
      cataractOutpatient: 7,
    },
    {
      outpatient: 42,
      exam: 28,
      surgery: 14,
      cataractExam: 11,
      cataractOutpatient: 9,
    },
  ],
}

/* ── 유틸 ── */
const withTotal = (d: MonthlyCancel): WithTotal => ({
  ...d,
  total:
    d.outpatient + d.exam + d.surgery + d.cataractExam + d.cataractOutpatient,
})
const periodData = (p: Period) =>
  withTotal(
    mockData[p.year]?.[p.month] ?? {
      outpatient: 0,
      exam: 0,
      surgery: 0,
      cataractExam: 0,
      cataractOutpatient: 0,
    },
  )
const yearSum = (year: number) => {
  const data = mockData[year] ?? []
  const s = {
    outpatient: data.reduce((a, d) => a + d.outpatient, 0),
    exam: data.reduce((a, d) => a + d.exam, 0),
    surgery: data.reduce((a, d) => a + d.surgery, 0),
    cataractExam: data.reduce((a, d) => a + d.cataractExam, 0),
    cataractOutpatient: data.reduce((a, d) => a + d.cataractOutpatient, 0),
  }
  return {
    ...s,
    total:
      s.outpatient + s.exam + s.surgery + s.cataractExam + s.cataractOutpatient,
  }
}

/* ── 메인 ── */
export function CancelRatePage() {
  const filter = useFilterBar()
  const [selectedMetrics, setSelectedMetrics] = useState<CancelKey[]>(['total'])

  const { mode, periods, years } = filter

  /* ── 월별 데이터 ── */
  const periodsData = useMemo(() => periods.map(periodData), [periods])
  const activeMetrics = useMemo(
    () =>
      selectedMetrics.includes('total')
        ? (['total'] as CancelKey[])
        : selectedMetrics,
    [selectedMetrics],
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
  const stackedData = useMemo(
    () =>
      periods.map((p, i) => ({
        name: periodLabel(p),
        ...Object.fromEntries(DETAIL_KEYS.map((k) => [k, periodsData[i][k]])),
      })),
    [periods, periodsData],
  )
  const donutData = useMemo(
    () =>
      periods.map((p, i) => ({
        label: periodLabel(p),
        slices: DETAIL_KEYS.map((key) => ({
          name: STACK_CONFIG[key].label,
          value: periodsData[i][key],
          fill: STACK_CONFIG[key].color,
        })),
      })),
    [periods, periodsData],
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

  /* ── 연도별 데이터 ── */
  const yearTotals = useMemo(() => years.map(yearSum), [years])
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
          const d = withTotal(
            mockData[y]?.[mi] ?? {
              outpatient: 0,
              exam: 0,
              surgery: 0,
              cataractExam: 0,
              cataractOutpatient: 0,
            },
          )
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
    [activeMetrics, years],
  )
  const yearStackedData = useMemo(
    () =>
      MONTHS.map((month, mi) => {
        const d = mockData[years[0]]?.[mi] ?? {
          outpatient: 0,
          exam: 0,
          surgery: 0,
          cataractExam: 0,
          cataractOutpatient: 0,
        }
        return { month, ...d }
      }),
    [years],
  )
  const yearComposedData = useMemo(
    () =>
      MONTHS.map((month, mi) => {
        const base = withTotal(
          mockData[years[0]]?.[mi] ?? {
            outpatient: 0,
            exam: 0,
            surgery: 0,
            cataractExam: 0,
            cataractOutpatient: 0,
          },
        )
        const comp = years[1]
          ? withTotal(
              mockData[years[1]]?.[mi] ?? {
                outpatient: 0,
                exam: 0,
                surgery: 0,
                cataractExam: 0,
                cataractOutpatient: 0,
              },
            )
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
    [years],
  )

  const toggleMetric = (metricKey: CancelKey) => {
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
      return DETAIL_KEYS.filter((key) => next.includes(key))
    })
  }

  return (
    <div className="space-y-6">
      {/* ── 필터 바 ── */}
      <FilterBar {...filter} />

      {/* ── KPI 카드 (3열 × 2행) ── */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {METRICS.map((m) => {
          const values =
            mode === 'month'
              ? periodsData.map((d) => d[m.key])
              : yearTotals.map((d) => d[m.key])
          const labels =
            mode === 'month'
              ? periods.map(periodLabel)
              : years.map((y) => `${y}년`)
          const base = values[0]
          return (
            <Card key={m.key} className="gap-2 border-border/70 shadow-sm">
              <CardHeader className="gap-0.5 pb-0">
                <CardTitle className="text-base font-semibold tracking-normal text-gray-900">
                  {m.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-0">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-3 border-b border-border/60 pb-2.5">
                  <p className="text-sm text-muted-foreground">
                    {labels[0]} (기준)
                  </p>
                  <p className="min-w-[7ch] text-right text-3xl font-semibold tracking-tight tabular-nums text-gray-900">
                    {base.toLocaleString()}
                  </p>
                </div>
                {values.slice(1).map((val, i) => {
                  const rate = changeRate(base, val)
                  const positive = rate > 0
                  const neutral = rate === 0
                  const TrendIcon = neutral
                    ? Minus
                    : positive
                      ? TrendingUp
                      : TrendingDown
                  return (
                    <div
                      key={labels[i + 1]}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3"
                    >
                      <span className="text-sm text-muted-foreground">
                        {labels[i + 1]}
                      </span>
                      <div className="flex items-center justify-end gap-2">
                        <span
                          className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${neutral ? 'bg-gray-100 text-gray-600' : positive ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}
                        >
                          <TrendIcon className="h-3 w-3" />
                          {rate > 0 ? '+' : ''}
                          {rate.toFixed(1)}%
                        </span>
                        <span className="min-w-[7ch] text-right text-sm font-medium tabular-nums text-gray-700">
                          {val.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )
        })}
      </section>

      {/* ── 차트 2×2 ── */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {mode === 'month' ? (
          <>
            {/* 1. 유형별 비교 */}
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>유형별 비교</CardTitle>
                <CardDescription>
                  {periods.map(periodLabel).join(' · ')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={monthChartConfig}
                  className="h-72 w-full"
                >
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
                        barSize={Math.max(12, 48 / periods.length)}
                      />
                    ))}
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
            {/* 2. 구성비 */}
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>구성비</CardTitle>
                <CardDescription>취소 유형별 적층</CardDescription>
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
                    <Bar
                      dataKey="outpatient"
                      stackId="s"
                      fill="var(--color-outpatient)"
                    />
                    <Bar dataKey="exam" stackId="s" fill="var(--color-exam)" />
                    <Bar
                      dataKey="surgery"
                      stackId="s"
                      fill="var(--color-surgery)"
                    />
                    <Bar
                      dataKey="cataractExam"
                      stackId="s"
                      fill="var(--color-cataractExam)"
                    />
                    <Bar
                      dataKey="cataractOutpatient"
                      stackId="s"
                      fill="var(--color-cataractOutpatient)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
            {/* 3. 비율 */}
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>비율</CardTitle>
                <CardDescription>기간별 취소 유형 비율</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`grid gap-4 ${periods.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}
                >
                  {donutData.map((d) => (
                    <div
                      key={d.label}
                      className="flex flex-col items-center gap-2"
                    >
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
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            {/* 4. 건수+증감 */}
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>건수 + 증감률</CardTitle>
                <CardDescription>
                  기준 대비 전체 취소 건수와 변화율
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={COMPOSED_CONFIG}
                  className="h-72 w-full"
                >
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
          </>
        ) : (
          <>
            {/* 1. 추이 비교 */}
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
                  {years.map((y) => `${y}년`).join(' · ')} — 12개월
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
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    {yearChartSeries.map((s) => (
                      <Line
                        key={s.key}
                        type="monotone"
                        dataKey={s.key}
                        stroke={`var(--color-${s.key})`}
                        strokeWidth={
                          activeMetrics.includes('total') ? 2.75 : 2.25
                        }
                        strokeDasharray={s.strokeDasharray || undefined}
                        dot={yearChartSeries.length <= 4 ? { r: 4 } : false}
                        activeDot={{ r: 6 }}
                      />
                    ))}
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
            {/* 2. 구성비 (Stacked Area) */}
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>구성비</CardTitle>
                <CardDescription>
                  {years[0]}년 취소 유형별 월별 적층
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
                      {DETAIL_KEYS.map((key) => (
                        <linearGradient
                          key={key}
                          id={`fill-c-${key}`}
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
                    {DETAIL_KEYS.map((key) => (
                      <Area
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stackId="1"
                        fill={`url(#fill-c-${key})`}
                        stroke={STACK_CONFIG[key].color}
                      />
                    ))}
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
            {/* 3. 건수+증감 */}
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>건수 + 증감률</CardTitle>
                <CardDescription>
                  {years[0]}년 월별 · {years[1] ?? years[0]}년 대비
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={COMPOSED_CONFIG}
                  className="h-72 w-full"
                >
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
            {/* 4. 연도별 비율 */}
            <Card className="border-border/70 shadow-sm">
              <CardHeader>
                <CardTitle>연도별 비율</CardTitle>
                <CardDescription>연간 합산 취소 유형 비율</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`grid gap-4 ${years.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}
                >
                  {years.map((y, yi) => (
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
                            data={DETAIL_KEYS.map((key) => ({
                              name: STACK_CONFIG[key].label,
                              value: yearTotals[yi][key],
                              fill: STACK_CONFIG[key].color,
                            }))}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={32}
                            strokeWidth={2}
                          />
                        </PieChart>
                      </ChartContainer>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </section>
    </div>
  )
}
