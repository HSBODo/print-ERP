import { useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#shared/ui/Card'
import { type ChartConfig } from '#shared/ui/Chart'
import { PanelShell } from '#shared/ui/PanelShell'
import { TrendLineChart, type TrendLine } from '#shared/ui/TrendLineChart'
import {
  METRICS,
  EMPTY,
  DETAIL_METRIC_KEYS,
  METRIC_COLORS,
  type MetricKey,
  type MonthlyData,
  formatRate,
} from './consultationRateUtils'
import { MONTHS, YEAR_STROKE_PATTERNS } from '#shared/constants/chart'
import { formatAxisPercent } from '#shared/utils/stats'

interface YearTrendPanelProps {
  dataMap: Record<number, MonthlyData[]>
  years: number[]
  isLoading: boolean
  isError: boolean
}

export function YearTrendPanel({
  dataMap,
  years,
  isLoading,
  isError,
}: YearTrendPanelProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>([
    'overallConsultation',
  ])

  const activeMetrics = useMemo(
    () =>
      selectedMetrics.includes('overallConsultation')
        ? (['overallConsultation'] as MetricKey[])
        : selectedMetrics,
    [selectedMetrics],
  )

  const yearChartSeries = useMemo(() => {
    if (activeMetrics.includes('overallConsultation')) {
      return years.map((year, yearIndex) => ({
        key: `y${yearIndex}_overallConsultation`,
        label: `${year}년 · 전체 상담 전환율`,
        color: METRIC_COLORS.overallConsultation,
        strokeDasharray: YEAR_STROKE_PATTERNS[yearIndex],
      }))
    }

    return years.flatMap((year, yearIndex) =>
      activeMetrics.map((metricKey) => {
        const metric = METRICS.find((item) => item.key === metricKey)

        return {
          key: `y${yearIndex}_${metricKey}`,
          label: `${year}년 · ${metric?.label ?? metricKey}`,
          color: METRIC_COLORS[metricKey],
          strokeDasharray: YEAR_STROKE_PATTERNS[yearIndex],
        }
      }),
    )
  }, [activeMetrics, years])

  const yearLineConfig = useMemo(() => {
    const config: ChartConfig = {}
    yearChartSeries.forEach((series) => {
      config[series.key] = {
        label: series.label,
        color: series.color,
      }
    })
    return config
  }, [yearChartSeries])

  const yearChartData = useMemo(
    () =>
      MONTHS.map((month, monthIndex) => {
        const row: Record<string, string | number> = { month }

        years.forEach((year, yearIndex) => {
          const data = dataMap[year]?.[monthIndex] ?? EMPTY

          if (activeMetrics.includes('overallConsultation')) {
            row[`y${yearIndex}_overallConsultation`] = data.overallConsultation
            return
          }

          activeMetrics.forEach((metricKey) => {
            row[`y${yearIndex}_${metricKey}`] = data[metricKey]
          })
        })

        return row
      }),
    [activeMetrics, years, dataMap],
  )

  const lines = useMemo<TrendLine[]>(() => {
    const strokeWidth = activeMetrics.includes('overallConsultation')
      ? 2.75
      : 2.25
    const dot = yearChartSeries.length <= 4 ? { r: 4 } : false
    return yearChartSeries.map((series) => ({
      key: series.key,
      strokeWidth,
      strokeDasharray: series.strokeDasharray,
      dot,
    }))
  }, [yearChartSeries, activeMetrics])

  const toggleMetric = (metricKey: MetricKey) => {
    if (metricKey === 'overallConsultation') {
      setSelectedMetrics(['overallConsultation'])
      return
    }

    setSelectedMetrics((current) => {
      const currentWithoutOverall = current.filter(
        (item) => item !== 'overallConsultation',
      )
      const next = currentWithoutOverall.includes(metricKey)
        ? currentWithoutOverall.filter((item) => item !== metricKey)
        : [...currentWithoutOverall, metricKey]

      if (!next.length) {
        return ['overallConsultation']
      }

      return DETAIL_METRIC_KEYS.filter((key) => next.includes(key))
    })
  }

  const renderChart = () => (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>월별 상담 전환율 추이</CardTitle>
            <CardDescription>
              전체는 상담 전환율 흐름으로, 세부 전환율을 여러 개 선택하면
              그래프가 분화됩니다.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-1 rounded-md bg-gray-100 p-1">
            {METRICS.map((metric) => (
              <button
                key={metric.key}
                type="button"
                onClick={() => toggleMetric(metric.key)}
                className={`h-8 rounded px-3 text-sm font-medium transition-colors ${
                  activeMetrics.includes(metric.key)
                    ? 'bg-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                style={
                  activeMetrics.includes(metric.key)
                    ? { color: METRIC_COLORS[metric.key] }
                    : undefined
                }
              >
                {metric.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <TrendLineChart
          config={yearLineConfig}
          data={yearChartData}
          lines={lines}
          yTickFormatter={formatAxisPercent}
          tooltipFormatter={(value) => formatRate(Number(value))}
        />
      </CardContent>
    </Card>
  )

  return (
    <PanelShell isLoading={isLoading} isError={isError} variant="line">
      {renderChart()}
    </PanelShell>
  )
}
