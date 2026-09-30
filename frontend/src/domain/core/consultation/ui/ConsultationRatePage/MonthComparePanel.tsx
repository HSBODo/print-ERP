import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#shared/ui/Card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '#shared/ui/Chart'
import { PanelShell } from '#shared/ui/PanelShell'
import {
  METRICS,
  EMPTY,
  type MonthlyData,
  formatRate,
} from './consultationRateUtils'
import { CHART_COLORS } from '#shared/constants/chart'
import { formatAxisPercent, periodLabel } from '#shared/utils/stats'

interface MonthComparePanelProps {
  dataMap: Record<number, MonthlyData[]>
  periods: Array<{ year: number; month: number }>
  isLoading: boolean
  isError: boolean
}

export function MonthComparePanel({
  dataMap,
  periods,
  isLoading,
  isError,
}: MonthComparePanelProps) {
  const periodsData = useMemo(
    () => periods.map((p) => dataMap[p.year]?.[p.month] ?? EMPTY),
    [periods, dataMap],
  )

  const monthChartConfig = useMemo(() => {
    const config: ChartConfig = {}
    periods.forEach((period, index) => {
      config[`p${index}`] = {
        label: periodLabel(period),
        color: CHART_COLORS[index],
      }
    })
    return config
  }, [periods])

  const monthChartData = useMemo(
    () =>
      METRICS.map((metric) => {
        const row: Record<string, string | number> = { name: metric.label }
        periodsData.forEach((data, index) => {
          row[`p${index}`] = data[metric.key]
        })
        return row
      }),
    [periodsData],
  )

  const renderChart = () => (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>상담/수술 전환율 비교</CardTitle>
        <CardDescription>
          시력교정 상담 전환과 수술 전환, 백내장 수술 전환 흐름을 같은 기간
          안에서 비교합니다.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={monthChartConfig} className="h-80 w-full">
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
              tickFormatter={formatAxisPercent}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatRate(Number(value))}
                />
              }
            />
            {periods.map((_, index) => (
              <Bar
                key={`p${index}`}
                dataKey={`p${index}`}
                fill={`var(--color-p${index})`}
                radius={[4, 4, 0, 0]}
                barSize={Math.max(16, 56 / periods.length)}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )

  return (
    <PanelShell isLoading={isLoading} isError={isError} variant="bar">
      {renderChart()}
    </PanelShell>
  )
}
