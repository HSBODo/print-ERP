import { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { type ChartConfig } from '@/components/ui/chart'
import { PanelShell } from '@/components/PanelShell'
import { TrendLineChart, type TrendLine } from '@/components/stats/TrendLineChart'
import {
  SURGERY_TYPES,
  EMPTY_DATA,
  type MonthlyData,
} from './surgeryRatioUtils'
import { MONTHS } from '@/constants/chart'
import { formatAxisNumber } from '@/utils/stats'

interface TrendPanelProps {
  trendYear: number
  dataMap: Record<number, MonthlyData[]>
  isLoading: boolean
  isError: boolean
}

export function TrendPanel({
  trendYear,
  dataMap,
  isLoading,
  isError,
}: TrendPanelProps) {
  const yearData = useMemo(() => {
    const ms = dataMap[trendYear] ?? []
    const r = { ...EMPTY_DATA }
    for (const m of ms) for (const k of SURGERY_TYPES) r[k.key] += m[k.key]
    return r
  }, [trendYear, dataMap])

  const shareData = useMemo(
    () =>
      SURGERY_TYPES.map((type) => ({
        key: type.key,
        name: type.label,
        value: yearData[type.key],
      }))
        .filter((item) => item.value > 0)
        .sort((left, right) => right.value - left.value),
    [yearData],
  )

  const topTrendKeys = useMemo(() => shareData.slice(0, 4).map((item) => item.key), [shareData])

  const topTrendConfig = useMemo(
    () =>
      Object.fromEntries(
        topTrendKeys.map((key) => {
          const type = SURGERY_TYPES.find((item) => item.key === key)
          return [
            key,
            {
              label: type?.label ?? key,
              color: type?.color ?? 'var(--chart-1)',
            },
          ]
        }),
      ) satisfies ChartConfig,
    [topTrendKeys],
  )

  const trendData = useMemo(
    () =>
      MONTHS.map((month, monthIndex) => {
        const row: Record<string, string | number> = { month }
        topTrendKeys.forEach((key) => {
          row[key] = dataMap[trendYear]?.[monthIndex]?.[key] ?? 0
        })
        return row
      }),
    [trendYear, topTrendKeys, dataMap],
  )

  const lines = useMemo<TrendLine[]>(() => topTrendKeys.map((key) => ({ key })), [topTrendKeys])

  const renderChart = () => (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>상위 수술 월별 추이</CardTitle>
        <CardDescription>{trendYear}년 기준 상위 4개 수술의 월별 추이입니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <TrendLineChart
          config={topTrendConfig}
          data={trendData}
          lines={lines}
          yTickFormatter={formatAxisNumber}
          className="h-96 w-full"
          showValueLabels
        />
      </CardContent>
    </Card>
  )

  return <PanelShell isLoading={isLoading} isError={isError} variant="line">{renderChart()}</PanelShell>
}
