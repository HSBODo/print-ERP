import { Minus, Plus, TrendingDown, TrendingUp, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from 'recharts'

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
import {
  type CompareMode,
  formatAxisNumber,
  formatAxisPercent,
  getCurrentPeriod,
  getDefaultPeriods,
  getDefaultYears,
  type Period,
  periodLabel,
} from '#shared/utils/stats'

/* ── 상수 ── */
type NoShowKey =
  'total' | 'outpatient' | 'exam' | 'cataractExam' | 'cataractOutpatient'

interface MonthlyNoShow {
  outpatient: number
  exam: number
  cataractExam: number
  cataractOutpatient: number
}
type WithTotal = MonthlyNoShow & { total: number }

const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]
const MAX_PERIODS = 4
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i)
const MONTHS = [
  '1월',
  '2월',
  '3월',
  '4월',
  '5월',
  '6월',
  '7월',
  '8월',
  '9월',
  '10월',
  '11월',
  '12월',
]
const CURRENT_PERIOD = getCurrentPeriod()
const DEFAULT_PERIODS = getDefaultPeriods(CURRENT_PERIOD)
const DEFAULT_YEARS = getDefaultYears(CURRENT_PERIOD.year)

const METRICS: { key: NoShowKey; label: string }[] = [
  { key: 'total', label: '전체 부도' },
  { key: 'outpatient', label: '외래부도' },
  { key: 'exam', label: '검사부도' },
  { key: 'cataractExam', label: '백내장검사부도' },
  { key: 'cataractOutpatient', label: '백내장외래부도' },
]

const COMPOSED_CONFIG = {
  total: { label: '부도 건수', color: 'var(--chart-1)' },
  rate: { label: '증감률 (%)', color: 'var(--chart-3)' },
} satisfies ChartConfig

/* ── Mock 데이터 ── */
const mockData: Record<number, MonthlyNoShow[]> = {
  2025: [
    { outpatient: 12, exam: 8, cataractExam: 3, cataractOutpatient: 2 },
    { outpatient: 15, exam: 10, cataractExam: 4, cataractOutpatient: 3 },
    { outpatient: 13, exam: 9, cataractExam: 3, cataractOutpatient: 2 },
    { outpatient: 18, exam: 12, cataractExam: 5, cataractOutpatient: 4 },
    { outpatient: 14, exam: 10, cataractExam: 4, cataractOutpatient: 3 },
    { outpatient: 20, exam: 14, cataractExam: 6, cataractOutpatient: 4 },
    { outpatient: 22, exam: 15, cataractExam: 7, cataractOutpatient: 5 },
    { outpatient: 19, exam: 13, cataractExam: 5, cataractOutpatient: 4 },
    { outpatient: 24, exam: 16, cataractExam: 8, cataractOutpatient: 6 },
    { outpatient: 26, exam: 18, cataractExam: 9, cataractOutpatient: 7 },
    { outpatient: 25, exam: 17, cataractExam: 8, cataractOutpatient: 6 },
    { outpatient: 28, exam: 20, cataractExam: 10, cataractOutpatient: 8 },
  ],
  2026: [
    { outpatient: 16, exam: 11, cataractExam: 4, cataractOutpatient: 3 },
    { outpatient: 20, exam: 14, cataractExam: 5, cataractOutpatient: 4 },
    { outpatient: 15, exam: 10, cataractExam: 3, cataractOutpatient: 2 },
    { outpatient: 22, exam: 15, cataractExam: 6, cataractOutpatient: 5 },
    { outpatient: 0, exam: 0, cataractExam: 0, cataractOutpatient: 0 },
    { outpatient: 0, exam: 0, cataractExam: 0, cataractOutpatient: 0 },
    { outpatient: 0, exam: 0, cataractExam: 0, cataractOutpatient: 0 },
    { outpatient: 0, exam: 0, cataractExam: 0, cataractOutpatient: 0 },
    { outpatient: 0, exam: 0, cataractExam: 0, cataractOutpatient: 0 },
    { outpatient: 0, exam: 0, cataractExam: 0, cataractOutpatient: 0 },
    { outpatient: 0, exam: 0, cataractExam: 0, cataractOutpatient: 0 },
    { outpatient: 0, exam: 0, cataractExam: 0, cataractOutpatient: 0 },
  ],
}

/* ── 유틸 ── */
const withTotal = (d: MonthlyNoShow): WithTotal => ({
  ...d,
  total: d.outpatient + d.exam + d.cataractExam + d.cataractOutpatient,
})
function changeRate(a: number, b: number) {
  if (a === 0) return b === 0 ? 0 : 100
  return ((b - a) / a) * 100
}
const periodData = (p: Period) =>
  withTotal(
    mockData[p.year]?.[p.month] ?? {
      outpatient: 0,
      exam: 0,
      cataractExam: 0,
      cataractOutpatient: 0,
    },
  )
const yearSum = (year: number) => {
  const data = mockData[year] ?? []
  const s = {
    outpatient: data.reduce((a, d) => a + d.outpatient, 0),
    exam: data.reduce((a, d) => a + d.exam, 0),
    cataractExam: data.reduce((a, d) => a + d.cataractExam, 0),
    cataractOutpatient: data.reduce((a, d) => a + d.cataractOutpatient, 0),
  }
  return {
    ...s,
    total: s.outpatient + s.exam + s.cataractExam + s.cataractOutpatient,
  }
}

/* ── Select ── */
function Select({
  value,
  onChange,
  options,
  title,
}: {
  value: number
  onChange: (v: number) => void
  options: { value: number; label: string }[]
  title: string
}) {
  return (
    <div className="relative">
      <select
        value={value}
        title={title}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 appearance-none rounded-md border border-gray-200 bg-gray-50 pl-3 pr-7 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-white focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </div>
  )
}

/* ── 기간 칩 ── */
const CHIP_STYLES: Record<number, string> = {
  0: 'border-blue-400 text-blue-600',
  1: 'border-pink-400 text-pink-600',
  2: 'border-amber-400 text-amber-600',
  3: 'border-emerald-400 text-emerald-600',
}
function PeriodChip({
  label,
  index,
  isBase,
  onRemove,
}: {
  label: string
  index: number
  isBase: boolean
  onRemove?: () => void
}) {
  return (
    <span
      className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm font-medium ${CHIP_STYLES[index] ?? CHIP_STYLES[0]}`}
    >
      {isBase && (
        <span className="rounded bg-current/10 px-1.5 py-0.5 text-xs opacity-70">
          기준
        </span>
      )}
      {label}
      {onRemove && (
        <button
          type="button"
          title={`${label} 삭제`}
          onClick={onRemove}
          className="hover:opacity-60 transition-opacity"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </span>
  )
}

/* ── 메인 ── */
export function NoShowRatePage() {
  const [mode, setMode] = useState<CompareMode>('month')
  const [periods, setPeriods] = useState<Period[]>(() => DEFAULT_PERIODS)
  const [years, setYears] = useState<number[]>(() => DEFAULT_YEARS)
  const [addYear, setAddYear] = useState(CURRENT_PERIOD.year)
  const [addMonth, setAddMonth] = useState(CURRENT_PERIOD.month)
  const [addYearOnly, setAddYearOnly] = useState(
    DEFAULT_YEARS[1] ?? CURRENT_PERIOD.year,
  )

  const yearOptions = YEARS.map((y) => ({ value: y, label: `${y}년` }))
  const monthOptions = MONTHS.map((m, i) => ({ value: i, label: m }))
  const addPeriod = () => {
    if (mode === 'month' && periods.length < MAX_PERIODS) {
      const dup = periods.some(
        (p) => p.year === addYear && p.month === addMonth,
      )
      if (!dup) setPeriods([...periods, { year: addYear, month: addMonth }])
    }
    if (mode === 'year' && years.length < MAX_PERIODS) {
      if (!years.includes(addYearOnly)) setYears([...years, addYearOnly])
    }
  }
  const removePeriod = (i: number) => {
    if (mode === 'month' && periods.length > 1)
      setPeriods(periods.filter((_, idx) => idx !== i))
    if (mode === 'year' && years.length > 1)
      setYears(years.filter((_, idx) => idx !== i))
  }

  /* ── 월별 데이터 ── */
  const periodsData = useMemo(() => periods.map(periodData), [periods])
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
  const yearComposedData = useMemo(
    () =>
      MONTHS.map((month, mi) => {
        const base = withTotal(
          mockData[years[0]]?.[mi] ?? {
            outpatient: 0,
            exam: 0,
            cataractExam: 0,
            cataractOutpatient: 0,
          },
        )
        const comp = years[1]
          ? withTotal(
              mockData[years[1]]?.[mi] ?? {
                outpatient: 0,
                exam: 0,
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

  // 연도별 Grouped Bar: 연도별 각 유형 비교
  const yearGroupedConfig = useMemo(() => {
    const cfg: ChartConfig = {}
    years.forEach((y, i) => {
      cfg[`y${i}`] = { label: `${y}년`, color: CHART_COLORS[i] }
    })
    return cfg
  }, [years])
  const yearGroupedData = useMemo(
    () =>
      METRICS.map((m) => {
        const row: Record<string, string | number> = { name: m.label }
        yearTotals.forEach((d, i) => {
          row[`y${i}`] = d[m.key]
        })
        return row
      }),
    [yearTotals],
  )

  return (
    <div className="space-y-6">
      {/* ── 필터 바 (예약통계 툴바 규격: flat white · px-2 py-1.5 · text-xs) ── */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-white px-2 py-1.5 text-xs shadow-sm">
        <div className="flex h-8 items-center gap-1 rounded-md bg-gray-100 p-0.5">
          {(
            [
              ['month', '월별'],
              ['year', '연도별'],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`h-full rounded px-3 text-sm font-medium transition-colors ${mode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="h-5 w-px bg-gray-200" />
        {mode === 'month'
          ? periods.map((p, i) => (
              <PeriodChip
                key={`${p.year}-${p.month}`}
                label={periodLabel(p)}
                index={i}
                isBase={i === 0}
                onRemove={
                  periods.length > 1 ? () => removePeriod(i) : undefined
                }
              />
            ))
          : years.map((y, i) => (
              <PeriodChip
                key={y}
                label={`${y}년`}
                index={i}
                isBase={i === 0}
                onRemove={years.length > 1 ? () => removePeriod(i) : undefined}
              />
            ))}
        <div className="h-5 w-px bg-gray-200" />
        {((mode === 'month' && periods.length < MAX_PERIODS) ||
          (mode === 'year' && years.length < MAX_PERIODS)) && (
          <div className="flex items-center gap-1.5">
            {mode === 'month' ? (
              <>
                <Select
                  value={addYear}
                  onChange={setAddYear}
                  options={yearOptions}
                  title="추가 연도"
                />
                <Select
                  value={addMonth}
                  onChange={setAddMonth}
                  options={monthOptions}
                  title="추가 월"
                />
              </>
            ) : (
              <Select
                value={addYearOnly}
                onChange={setAddYearOnly}
                options={yearOptions}
                title="추가 연도"
              />
            )}
            <button
              type="button"
              onClick={addPeriod}
              className="flex h-8 items-center gap-1 rounded-md border border-dashed border-gray-300 px-3 text-sm font-medium text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700"
            >
              <Plus className="h-3.5 w-3.5" />
              추가
            </button>
          </div>
        )}
        <button
          type="button"
          className="ml-auto h-8 rounded-md bg-blue-600 px-4 text-xs font-medium text-white transition-colors hover:bg-blue-700 active:bg-blue-800"
        >
          조회
        </button>
      </div>

      {/* ── KPI 카드 ── */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
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
                  <p className="min-w-[5ch] text-right text-3xl font-semibold tracking-tight tabular-nums text-gray-900">
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
                        <span className="min-w-[5ch] text-right text-sm font-medium tabular-nums text-gray-700">
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

      {/* ── 차트 2열 ── */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* 유형별 비교 */}
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>유형별 비교</CardTitle>
            <CardDescription>
              {mode === 'month'
                ? periods.map(periodLabel).join(' · ')
                : years.map((y) => `${y}년`).join(' · ')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mode === 'month' ? (
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
                      barSize={Math.max(12, 48 / periods.length)}
                    />
                  ))}
                </BarChart>
              </ChartContainer>
            ) : (
              <ChartContainer
                config={yearGroupedConfig}
                className="h-72 w-full"
              >
                <BarChart data={yearGroupedData}>
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
                  {years.map((_, i) => (
                    <Bar
                      key={`y${i}`}
                      dataKey={`y${i}`}
                      fill={`var(--color-y${i})`}
                      radius={[4, 4, 0, 0]}
                      barSize={Math.max(12, 48 / years.length)}
                    />
                  ))}
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
        {/* 건수+증감 */}
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>건수 + 증감률</CardTitle>
            <CardDescription>
              {mode === 'month'
                ? '기준 대비 전체 부도 건수와 변화율'
                : `${years[0]}년 월별 · ${years[1] ?? years[0]}년 대비`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mode === 'month' ? (
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
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </ComposedChart>
              </ChartContainer>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
