import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
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
import { type MetricDef, MetricSection } from '#shared/ui/MetricSection'
import { periodLabel } from '#shared/utils/stats'

import { b2bApi } from '../../api'
import type { B2bRevenueMonthlyItem } from '../../type/api'

interface MonthlyData {
  totalRevenue: number
  caseCount: number
  avgRevenuePerCase: number
  visionRevenue: number
  cataractRevenue: number
  designatedRevenue: number
  nonDesignatedRevenue: number
  opCost: number
  examCost: number
  dnaCost: number
  prpCost: number
  etcCost: number
  presbyopiaCost: number
  hospitalSupplyCost: number
}

type DerivedData = MonthlyData & {
  designatedShareRate: number
  visionShareRate: number
}

const EMPTY: MonthlyData = {
  totalRevenue: 0,
  caseCount: 0,
  avgRevenuePerCase: 0,
  visionRevenue: 0,
  cataractRevenue: 0,
  designatedRevenue: 0,
  nonDesignatedRevenue: 0,
  opCost: 0,
  examCost: 0,
  dnaCost: 0,
  prpCost: 0,
  etcCost: 0,
  presbyopiaCost: 0,
  hospitalSupplyCost: 0,
}

const formatWon = (value: number) => `${value.toLocaleString('ko-KR')}원`
const formatCount = (value: number) => `${value.toLocaleString('ko-KR')}건`
const formatPercent = (value: number) => `${value.toFixed(1)}%`

const formatCurrencyCompact = (value: number | string) => {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return String(value)
  if (Math.abs(amount) >= 100_000_000)
    return `${(amount / 100_000_000).toFixed(1)}억`
  if (Math.abs(amount) >= 10_000)
    return `${Math.round(amount / 10_000).toLocaleString('ko-KR')}만`
  return amount.toLocaleString('ko-KR')
}

const REVENUE_METRICS: MetricDef<DerivedData>[] = [
  { key: 'totalRevenue', label: '총 B2B 매출', format: formatWon },
  { key: 'visionRevenue', label: '시력교정 매출', format: formatWon },
  { key: 'cataractRevenue', label: '백내장 매출', format: formatWon },
  { key: 'designatedRevenue', label: '지정 매출', format: formatWon },
]

const EFFICIENCY_METRICS: MetricDef<DerivedData>[] = [
  { key: 'caseCount', label: 'B2B 건수', format: formatCount },
  { key: 'avgRevenuePerCase', label: '건당 매출', format: formatWon },
  {
    key: 'designatedShareRate',
    label: '지정 매출 비중',
    format: formatPercent,
  },
  {
    key: 'visionShareRate',
    label: '시력교정 매출 비중',
    format: formatPercent,
  },
]

const REVENUE_CONFIG = {
  totalRevenue: { label: '총매출', color: 'var(--chart-1)' },
  visionRevenue: { label: '시력교정', color: 'var(--chart-3)' },
  cataractRevenue: { label: '백내장', color: 'var(--chart-4)' },
  designatedRevenue: { label: '지정', color: 'var(--chart-5)' },
} satisfies ChartConfig

const SPLIT_CONFIG = {
  visionRevenue: { label: '시력교정', color: 'var(--chart-1)' },
  cataractRevenue: { label: '백내장', color: 'var(--chart-3)' },
  designatedRevenue: { label: '지정', color: 'var(--chart-1)' },
  nonDesignatedRevenue: { label: '비지정', color: 'var(--chart-4)' },
} satisfies ChartConfig

const COST_CONFIG = {
  opCost: { label: '수술비', color: 'var(--chart-1)' },
  examCost: { label: '검사비', color: 'var(--chart-3)' },
  dnaCost: { label: 'DNA', color: 'var(--chart-4)' },
  prpCost: { label: 'PRP', color: 'var(--chart-5)' },
  etcCost: { label: '기타/약', color: '#f97316' },
  presbyopiaCost: { label: '노안', color: '#06b6d4' },
  hospitalSupplyCost: { label: '병원물품', color: '#84cc16' },
} satisfies ChartConfig

const COST_KEYS = [
  'opCost',
  'examCost',
  'dnaCost',
  'prpCost',
  'etcCost',
  'presbyopiaCost',
  'hospitalSupplyCost',
] as const

const toDataMap = (
  items: B2bRevenueMonthlyItem[],
): Record<number, MonthlyData[]> => {
  const map: Record<number, MonthlyData[]> = {}
  for (const item of items) {
    if (!map[item.year])
      map[item.year] = Array.from({ length: 12 }, () => ({ ...EMPTY }))
    map[item.year][item.month - 1] = {
      totalRevenue: item.totalRevenue,
      caseCount: item.caseCount,
      avgRevenuePerCase: item.avgRevenuePerCase,
      visionRevenue: item.visionRevenue,
      cataractRevenue: item.cataractRevenue,
      designatedRevenue: item.designatedRevenue,
      nonDesignatedRevenue: item.nonDesignatedRevenue,
      opCost: item.opCost,
      examCost: item.examCost,
      dnaCost: item.dnaCost,
      prpCost: item.prpCost,
      etcCost: item.etcCost,
      presbyopiaCost: item.presbyopiaCost,
      hospitalSupplyCost: item.hospitalSupplyCost,
    }
  }
  return map
}

const sumMonths = (months: MonthlyData[]) =>
  months.reduce<MonthlyData>(
    (acc, item) => ({
      totalRevenue: acc.totalRevenue + item.totalRevenue,
      caseCount: acc.caseCount + item.caseCount,
      avgRevenuePerCase: 0,
      visionRevenue: acc.visionRevenue + item.visionRevenue,
      cataractRevenue: acc.cataractRevenue + item.cataractRevenue,
      designatedRevenue: acc.designatedRevenue + item.designatedRevenue,
      nonDesignatedRevenue:
        acc.nonDesignatedRevenue + item.nonDesignatedRevenue,
      opCost: acc.opCost + item.opCost,
      examCost: acc.examCost + item.examCost,
      dnaCost: acc.dnaCost + item.dnaCost,
      prpCost: acc.prpCost + item.prpCost,
      etcCost: acc.etcCost + item.etcCost,
      presbyopiaCost: acc.presbyopiaCost + item.presbyopiaCost,
      hospitalSupplyCost: acc.hospitalSupplyCost + item.hospitalSupplyCost,
    }),
    { ...EMPTY },
  )

const derive = (item: MonthlyData): DerivedData => ({
  ...item,
  avgRevenuePerCase:
    item.caseCount > 0 ? Math.round(item.totalRevenue / item.caseCount) : 0,
  designatedShareRate:
    item.totalRevenue > 0
      ? (item.designatedRevenue / item.totalRevenue) * 100
      : 0,
  visionShareRate:
    item.totalRevenue > 0 ? (item.visionRevenue / item.totalRevenue) * 100 : 0,
})

export function B2BRevenuePage() {
  const filter = useFilterBar()
  const { mode, periods, years } = filter

  const queryYears = useMemo(() => {
    const set = new Set<number>()
    if (mode === 'month') periods.forEach((period) => set.add(period.year))
    else years.forEach((year) => set.add(year))
    return [...set].sort()
  }, [mode, periods, years])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['b2b-revenue-monthly', queryYears],
    queryFn: ({ signal }) => b2bApi.getB2bRevenueMonthly(queryYears, signal),
    enabled: queryYears.length > 0,
  })

  const dataMap = useMemo(() => (data ? toDataMap(data) : {}), [data])
  const periodsData = useMemo(
    () =>
      periods.map((period) =>
        derive(dataMap[period.year]?.[period.month] ?? EMPTY),
      ),
    [periods, dataMap],
  )
  const yearTotals = useMemo(
    () => years.map((year) => derive(sumMonths(dataMap[year] ?? []))),
    [years, dataMap],
  )
  const labels =
    mode === 'month'
      ? periods.map(periodLabel)
      : years.map((year) => `${year}년`)
  const source = mode === 'month' ? periodsData : yearTotals

  const monthRevenueData = useMemo(
    () =>
      periods.map((period, index) => ({
        period: periodLabel(period),
        totalRevenue: periodsData[index].totalRevenue,
        visionRevenue: periodsData[index].visionRevenue,
        cataractRevenue: periodsData[index].cataractRevenue,
        designatedRevenue: periodsData[index].designatedRevenue,
      })),
    [periods, periodsData],
  )
  const monthCategoryData = useMemo(
    () =>
      periods.map((period, index) => ({
        period: periodLabel(period),
        visionRevenue: periodsData[index].visionRevenue,
        cataractRevenue: periodsData[index].cataractRevenue,
      })),
    [periods, periodsData],
  )
  const monthDesignationData = useMemo(
    () =>
      periods.map((period, index) => ({
        period: periodLabel(period),
        designatedRevenue: periodsData[index].designatedRevenue,
        nonDesignatedRevenue: periodsData[index].nonDesignatedRevenue,
      })),
    [periods, periodsData],
  )
  const monthCostData = useMemo(
    () =>
      periods.map((period, index) => ({
        period: periodLabel(period),
        opCost: periodsData[index].opCost,
        examCost: periodsData[index].examCost,
        dnaCost: periodsData[index].dnaCost,
        prpCost: periodsData[index].prpCost,
        etcCost: periodsData[index].etcCost,
        presbyopiaCost: periodsData[index].presbyopiaCost,
        hospitalSupplyCost: periodsData[index].hospitalSupplyCost,
      })),
    [periods, periodsData],
  )

  const yearSeries = useMemo(() => {
    const config: ChartConfig = {}
    years.forEach((year, index) => {
      config[`y${index}`] = {
        label: `${year}년`,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }
    })
    return config
  }, [years])
  const yearRevenueData = useMemo(
    () =>
      MONTHS.map((month, monthIndex) => {
        const row: Record<string, string | number> = { month }
        years.forEach((year, index) => {
          row[`y${index}`] = dataMap[year]?.[monthIndex]?.totalRevenue ?? 0
        })
        return row
      }),
    [years, dataMap],
  )
  const yearAverageData = useMemo(
    () =>
      MONTHS.map((month, monthIndex) => {
        const row: Record<string, string | number> = { month }
        years.forEach((year, index) => {
          row[`y${index}`] = derive(
            dataMap[year]?.[monthIndex] ?? EMPTY,
          ).avgRevenuePerCase
        })
        return row
      }),
    [years, dataMap],
  )
  const yearSummaryData = useMemo(
    () =>
      years.map((year, index) => ({
        year: `${year}년`,
        totalRevenue: yearTotals[index].totalRevenue,
        visionRevenue: yearTotals[index].visionRevenue,
        cataractRevenue: yearTotals[index].cataractRevenue,
        designatedRevenue: yearTotals[index].designatedRevenue,
      })),
    [years, yearTotals],
  )
  const yearCostData = useMemo(
    () =>
      years.map((year, index) => ({
        year: `${year}년`,
        opCost: yearTotals[index].opCost,
        examCost: yearTotals[index].examCost,
        dnaCost: yearTotals[index].dnaCost,
        prpCost: yearTotals[index].prpCost,
        etcCost: yearTotals[index].etcCost,
        presbyopiaCost: yearTotals[index].presbyopiaCost,
        hospitalSupplyCost: yearTotals[index].hospitalSupplyCost,
      })),
    [years, yearTotals],
  )

  return (
    <div className="space-y-6">
      <FilterBar {...filter} />
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">B2B 매출 데이터를 불러오는 중...</span>
        </div>
      )}
      {isError && (
        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardContent className="py-6 text-center text-sm text-destructive">
            데이터를 불러오지 못했습니다. BCRM/MSSQL 연결과 API 설정을
            확인해주세요.
          </CardContent>
        </Card>
      )}
      {!isLoading && !isError && (
        <>
          <MetricSection
            title="매출 요약"
            metrics={REVENUE_METRICS}
            source={source}
            labels={labels}
          />
          <MetricSection
            title="운영 지표"
            metrics={EFFICIENCY_METRICS}
            source={source}
            labels={labels}
          />

          {mode === 'month' ? (
            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle>기간별 매출 비교</CardTitle>
                  <CardDescription>
                    총매출과 주요 매출 구성을 함께 봅니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={REVENUE_CONFIG}
                    className="h-80 w-full"
                  >
                    <BarChart data={monthRevenueData}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="period"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={formatCurrencyCompact}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => formatWon(Number(value))}
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar
                        dataKey="totalRevenue"
                        fill="var(--color-totalRevenue)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="visionRevenue"
                        fill="var(--color-visionRevenue)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="cataractRevenue"
                        fill="var(--color-cataractRevenue)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="designatedRevenue"
                        fill="var(--color-designatedRevenue)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle>수술군 구성</CardTitle>
                  <CardDescription>
                    시력교정과 백내장 매출 비중입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={SPLIT_CONFIG} className="h-80 w-full">
                    <BarChart data={monthCategoryData}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="period"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={formatCurrencyCompact}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => formatWon(Number(value))}
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar
                        dataKey="visionRevenue"
                        stackId="category"
                        fill="var(--color-visionRevenue)"
                      />
                      <Bar
                        dataKey="cataractRevenue"
                        stackId="category"
                        fill="var(--color-cataractRevenue)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle>지정 vs 비지정</CardTitle>
                  <CardDescription>
                    지정 여부에 따른 매출 분포입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={SPLIT_CONFIG} className="h-80 w-full">
                    <BarChart data={monthDesignationData}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="period"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={formatCurrencyCompact}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => formatWon(Number(value))}
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar
                        dataKey="designatedRevenue"
                        stackId="designation"
                        fill="var(--color-designatedRevenue)"
                      />
                      <Bar
                        dataKey="nonDesignatedRevenue"
                        stackId="designation"
                        fill="var(--color-nonDesignatedRevenue)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle>수가항목 7종 구성</CardTitle>
                  <CardDescription>
                    BCRM 결산 기준 7개 항목 합산 매출입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={COST_CONFIG} className="h-80 w-full">
                    <BarChart data={monthCostData}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="period"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={formatCurrencyCompact}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => formatWon(Number(value))}
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      {COST_KEYS.map((key, index) => (
                        <Bar
                          key={key}
                          dataKey={key}
                          stackId="cost"
                          fill={`var(--color-${key})`}
                          radius={
                            index === COST_KEYS.length - 1
                              ? [4, 4, 0, 0]
                              : [0, 0, 0, 0]
                          }
                        />
                      ))}
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </section>
          ) : (
            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle>월별 총매출 추이</CardTitle>
                  <CardDescription>
                    연도별 월간 B2B 매출 흐름입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={yearSeries} className="h-80 w-full">
                    <LineChart data={yearRevenueData}>
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
                        tickFormatter={formatCurrencyCompact}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => formatWon(Number(value))}
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      {years.map((year, index) => (
                        <Line
                          key={year}
                          type="monotone"
                          dataKey={`y${index}`}
                          stroke={`var(--color-y${index})`}
                          strokeWidth={2}
                          dot={false}
                          strokeDasharray={YEAR_STROKE_PATTERNS[index]}
                        />
                      ))}
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle>월별 건당 매출 추이</CardTitle>
                  <CardDescription>
                    연도별 객단가 흐름을 비교합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={yearSeries} className="h-80 w-full">
                    <LineChart data={yearAverageData}>
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
                        tickFormatter={formatCurrencyCompact}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => formatWon(Number(value))}
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      {years.map((year, index) => (
                        <Line
                          key={year}
                          type="monotone"
                          dataKey={`y${index}`}
                          stroke={`var(--color-y${index})`}
                          strokeWidth={2}
                          dot={false}
                          strokeDasharray={YEAR_STROKE_PATTERNS[index]}
                        />
                      ))}
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>
              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle>연도별 매출 구조</CardTitle>
                  <CardDescription>
                    총매출과 핵심 세부 매출의 연간 비교입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={REVENUE_CONFIG}
                    className="h-80 w-full"
                  >
                    <BarChart data={yearSummaryData}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="year"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={formatCurrencyCompact}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => formatWon(Number(value))}
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar
                        dataKey="totalRevenue"
                        fill="var(--color-totalRevenue)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="visionRevenue"
                        fill="var(--color-visionRevenue)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="cataractRevenue"
                        fill="var(--color-cataractRevenue)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="designatedRevenue"
                        fill="var(--color-designatedRevenue)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle>연도별 수가항목 구성</CardTitle>
                  <CardDescription>
                    7개 수가항목 누적 매출 비교입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={COST_CONFIG} className="h-80 w-full">
                    <BarChart data={yearCostData}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="year"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={formatCurrencyCompact}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value) => formatWon(Number(value))}
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent />} />
                      {COST_KEYS.map((key, index) => (
                        <Bar
                          key={key}
                          dataKey={key}
                          stackId="yearCost"
                          fill={`var(--color-${key})`}
                          radius={
                            index === COST_KEYS.length - 1
                              ? [4, 4, 0, 0]
                              : [0, 0, 0, 0]
                          }
                        />
                      ))}
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </section>
          )}
        </>
      )}
    </div>
  )
}
