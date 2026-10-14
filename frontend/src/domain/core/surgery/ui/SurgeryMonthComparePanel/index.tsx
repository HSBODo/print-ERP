import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { CHART_COLORS } from '#shared/constants/chart'
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
  ChartTooltip,
  ChartTooltipContent,
} from '#shared/ui/Chart'
import { PanelShell } from '#shared/ui/PanelShell'
import { formatAxisNumber, periodLabel } from '#shared/utils/stats'

import {
  EMPTY,
  GROUPS,
  gSum,
  type SurgeryData,
} from '../../utils/surgeryGroups'

export function SurgeryMonthComparePanel({
  dataMap,
  periods,
  isLoading,
  isError,
}: {
  dataMap: Record<number, SurgeryData[]>
  periods: { year: number; month: number }[]
  isLoading: boolean
  isError: boolean
}) {
  const periodsData = useMemo(
    () => periods.map((p) => dataMap[p.year]?.[p.month] ?? EMPTY),
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
      GROUPS.map((g) => {
        const row: Record<string, string | number> = { name: g.label }
        periodsData.forEach((d, i) => {
          row[`p${i}`] = gSum(d, g)
        })
        return row
      }),
    [periodsData],
  )

  const renderChart = () => (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>수술 유형별 비교</CardTitle>
        <CardDescription>
          {periods.map(periodLabel).join(' · ')}
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
              tickFormatter={formatAxisNumber}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
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
  )

  return (
    <PanelShell isLoading={isLoading} isError={isError} variant="bar">
      {renderChart()}
    </PanelShell>
  )
}
