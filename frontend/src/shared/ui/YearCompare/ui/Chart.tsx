import { useMemo } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  XAxis,
  YAxis,
} from 'recharts'

import { MONTHS } from '#shared/constants/chart'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '#shared/ui/Chart'
import { cn } from '#shared/utils/cn'

import { yAxisFor } from '../axis'
import { formatValue, TICK_FORMATTER } from '../format'
import type {
  ChartMonthLabel,
  YearCompareFormat,
  YearCompareRow,
  YearSeries,
} from '../type'
import { EventMarker } from './EventMarker'
import { latestLabel } from './LatestLabel'
import { Legend } from './Legend'
import { MonthWithEvents } from './MonthWithEvents'

/** 축 바닥 아래 여백(px) — 바닥에 붙은 점도 값 레이블(점 아래)이 눈금 글자와 겹치지 않게 */
const LABEL_SPACE = 28

interface Props {
  chartConfig: ChartConfig
  chartData: YearCompareRow[]
  series: YearSeries[]
  format: YearCompareFormat
  /** 비율 소수 자릿수 (기본 1) */
  percentDigits?: number
  /** 마커는 값이 있는 점에만, 툴팁에는 그 달이면 항상 */
  annotations?: ChartMonthLabel[]
  /** 가리킨 달(0 = 1월)이 바뀔 때 — 차트 밖 상세 패널용 */
  onActiveMonthChange?: (monthIndex: number) => void
  /** 기본은 남은 높이를 채운다 — 높이가 정해지지 않은 곳에서는 'h-96 flex-none' 처럼 고정 */
  className?: string
}

/** 월별 연도 비교 선 차트(위에 연도 범례) — 최신 연도는 값 레이블(정점 위·골 아래), annotations 는 점에 깃발 마커 + 툴팁 */
export function Chart({
  chartConfig,
  chartData,
  series,
  format,
  percentDigits = 1,
  annotations,
  onActiveMonthChange,
  className,
}: Props) {
  const formatLabel = (value: unknown) =>
    typeof value === 'number' ? formatValue(format, value, percentDigits) : ''

  // 축·레이블은 chartData 가 바뀔 때만 새로 만든다 — 참조가 바뀌면 Recharts 가 선 애니메이션을
  // 다시 시작하고 그동안 값 레이블을 숨긴다(useYearCompare 의 chartData 메모와 같은 이유)
  const yAxis = useMemo(
    () => yAxisFor(format, chartData, series),
    [format, chartData, series],
  )
  const latest = series.find((s) => s.isLatest)
  const renderLatestLabel = useMemo(
    () =>
      latest &&
      latestLabel(
        chartData.map((row) => {
          const value = row[latest.key]
          return typeof value === 'number' ? value : null
        }),
        latest.color,
        (value) => formatValue(format, value, percentDigits),
      ),
    [chartData, latest, format, percentDigits],
  )

  // 범례는 차트와 같은 열에 둔다 — 옆에 패널이 붙어도 차트 기준 가운데
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col gap-3', className)}>
      <Legend series={series} />
      <ChartContainer
        config={chartConfig}
        className="aspect-auto min-h-0 w-full flex-1"
      >
        <LineChart
          data={chartData}
          margin={{ top: 24, left: 0, right: 80 }}
          onMouseMove={({ activeLabel }) => {
            const monthIndex = MONTHS.indexOf(String(activeLabel))
            if (monthIndex >= 0) onActiveMonthChange?.(monthIndex)
          }}
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
            domain={yAxis.domain}
            ticks={yAxis.ticks}
            padding={{ bottom: LABEL_SPACE }}
            // 고정 함수여야 한다 — 렌더마다 새 함수면 Recharts 가 축을 다시 등록해 선 애니메이션을 재시작하고
            // 그동안 값 레이블을 숨긴다(호버로 페이지가 다시 렌더되는 예약 종합에서 레이블이 사라짐)
            tickFormatter={TICK_FORMATTER[format]}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                valueFormatter={formatLabel}
                labelFormatter={(month) => (
                  <MonthWithEvents
                    month={typeof month === 'string' ? month : ''}
                    annotations={annotations}
                    series={series}
                  />
                )}
              />
            }
          />
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
              label={s.isLatest ? renderLatestLabel : undefined}
            />
          ))}
          {annotations?.map(({ year, monthIndex }) => {
            const line = series.find((s) => s.year === year)
            const value = chartData[monthIndex]?.[`y${year}`]
            if (!line || typeof value !== 'number') return null
            return (
              <ReferenceDot
                key={`${year}-${monthIndex}`}
                x={MONTHS[monthIndex]}
                y={value}
                shape={(props: { cx?: number; cy?: number }) => (
                  <EventMarker cx={props.cx} cy={props.cy} color={line.color} />
                )}
              />
            )
          })}
        </LineChart>
      </ChartContainer>
    </div>
  )
}
