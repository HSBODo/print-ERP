import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'

import { CURRENT_YEAR, MONTHS } from '#shared/constants/chart'
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
import { FilterBar } from '#shared/ui/FilterBar'
import { useFilterBar } from '#shared/ui/FilterBar/useFilterBar'
import { PanelShell } from '#shared/ui/PanelShell'
import { formatAxisNumber } from '#shared/utils/stats'

import { useOutpatientCountTrend } from '../../hooks/useOutpatientCountTrend'

const RECENCY_COLORS = ['#E11D2E', '#4B5563', '#A8CEDF', '#F59E0B']

export function OutpatientCountPage() {
  const filter = useFilterBar('year', [
    CURRENT_YEAR - 2,
    CURRENT_YEAR - 1,
    CURRENT_YEAR,
  ])

  const sortedYears = useMemo(
    () => [...filter.years].sort((a, b) => a - b),
    [filter.years],
  )
  const { dataMap, isLoading, isError } = useOutpatientCountTrend(sortedYears)

  const series = useMemo(() => {
    const latestYear = sortedYears[sortedYears.length - 1]
    return sortedYears.map((year, index) => ({
      year,
      key: `y${year}`,
      color:
        RECENCY_COLORS[
          Math.min(sortedYears.length - 1 - index, RECENCY_COLORS.length - 1)
        ],
      isLatest: year === latestYear,
    }))
  }, [sortedYears])

  const yearChipColors = useMemo(() => {
    const map: Record<number, string> = {}
    series.forEach((s) => {
      map[s.year] = s.color
    })
    return map
  }, [series])

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {}
    series.forEach((s) => {
      config[s.key] = { label: `${s.year}`, color: s.color }
    })
    return config
  }, [series])

  const chartData = useMemo(
    () =>
      MONTHS.map((month, monthIndex) => {
        const row: Record<string, string | number | null> = { month }
        sortedYears.forEach((year) => {
          const item = dataMap[year]?.[monthIndex]
          row[`y${year}`] = item?.outpatientCount ?? null
        })
        return row
      }),
    [sortedYears, dataMap],
  )

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[40rem] flex-col gap-6">
      <FilterBar {...filter} yearOnly yearChipColors={yearChipColors} />
      <PanelShell
        isLoading={isLoading}
        isError={isError}
        variant="line"
        className="flex min-h-0 flex-1 flex-col"
      >
        <Card className="flex min-h-0 flex-1 flex-col border-border/70 shadow-sm">
          <CardHeader className="space-y-3">
            <div>
              <CardTitle>월별 추이 비교</CardTitle>
              <CardDescription>
                외래수는 외래 예약(F) 중 내원·퇴원 처리된 건수입니다.
                2024·2025년은 확정값, 2026년부터는 운영 DB 집계입니다.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {series.map((s) => (
                <span
                  key={s.year}
                  className="flex items-center gap-2 text-sm font-bold"
                  style={{ color: s.isLatest ? s.color : '#374151' }}
                >
                  <span
                    className="h-[3px] w-8 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.year}
                </span>
              ))}
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
            <ChartContainer
              config={chartConfig}
              className="aspect-auto min-h-0 w-full flex-1"
            >
              <LineChart
                data={chartData}
                margin={{ top: 24, left: 0, right: 80 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  scale="band"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  width={80}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  domain={['dataMin - 200', 'dataMax + 200']}
                  tickFormatter={formatAxisNumber}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                {series.map((s) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    stroke={s.color}
                    strokeWidth={s.isLatest ? 3 : 2.5}
                    dot={false}
                    connectNulls={false}
                    activeDot={{ r: 4 }}
                    label={
                      s.isLatest
                        ? {
                            position: 'bottom',
                            offset: 16,
                            fill: s.color,
                            fontSize: 14,
                            fontWeight: 700,
                            formatter: (value: unknown) =>
                              typeof value === 'number'
                                ? formatAxisNumber(value)
                                : '',
                          }
                        : undefined
                    }
                  />
                ))}
              </LineChart>
            </ChartContainer>

            <div className="shrink-0 overflow-x-auto">
              <table className="w-full min-w-[840px] table-fixed border-collapse text-center text-sm">
                <colgroup>
                  <col className="w-20" />
                  {MONTHS.map((month) => (
                    <col key={month} />
                  ))}
                  <col className="w-20" />
                </colgroup>
                <thead>
                  <tr className="border-y border-border bg-muted/40">
                    <th className="py-2" />
                    {MONTHS.map((month) => (
                      <th
                        key={month}
                        className="py-2 font-semibold text-foreground"
                      >
                        {month}
                      </th>
                    ))}
                    <th className="py-2 font-semibold text-foreground">합계</th>
                  </tr>
                </thead>
                <tbody>
                  {series.map((s) => {
                    const total = chartData.reduce((sum, row) => {
                      const value = row[s.key]
                      return typeof value === 'number' ? sum + value : sum
                    }, 0)

                    return (
                      <tr key={s.year} className="border-b border-border">
                        <td className="py-2">
                          <span
                            className="flex items-center justify-center gap-1.5 font-semibold"
                            style={{ color: s.isLatest ? s.color : undefined }}
                          >
                            <span
                              className="h-[3px] w-5 rounded-full"
                              style={{ backgroundColor: s.color }}
                            />
                            {s.year}
                          </span>
                        </td>
                        {MONTHS.map((_, monthIndex) => {
                          const value = chartData[monthIndex][s.key]
                          return (
                            <td key={monthIndex} className="py-2 tabular-nums">
                              {typeof value === 'number'
                                ? formatAxisNumber(value)
                                : ''}
                            </td>
                          )
                        })}
                        <td className="py-2 font-semibold tabular-nums">
                          {total > 0 ? formatAxisNumber(total) : ''}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </PanelShell>
    </div>
  )
}
