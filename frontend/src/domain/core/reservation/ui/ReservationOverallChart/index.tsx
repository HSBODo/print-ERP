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
import { formatAxisNumber } from '#shared/utils/stats'

import type {
  ReservationOverallRow,
  ReservationOverallSeries,
} from '../../hooks/useReservationOverall'
import { EventMarker } from './EventMarker'
import { MonthWithEvents } from './MonthWithEvents'
import type { ChartMonthLabel } from './type'

interface Props {
  chartConfig: ChartConfig
  chartData: ReservationOverallRow[]
  series: ReservationOverallSeries[]
  /** 마커는 값이 있는 점에만, 툴팁에는 그 달이면 항상 */
  annotations?: ChartMonthLabel[]
  /** 가리킨 달(0 = 1월)이 바뀔 때 — 차트 밖 상세 패널용 */
  onActiveMonthChange?: (monthIndex: number) => void
}

/** 월별 연도 비교 선 차트 — 최신 연도는 값 레이블(점 아래), annotations 는 점에 깃발 마커 + 툴팁 */
export function ReservationOverallChart({
  chartConfig,
  chartData,
  series,
  annotations,
  onActiveMonthChange,
}: Props) {
  return (
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
          domain={['dataMin - 200', 'dataMax + 200']}
          tickFormatter={formatAxisNumber}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
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
            label={
              s.isLatest
                ? {
                    position: 'bottom',
                    offset: 16,
                    fill: s.color,
                    fontSize: 14,
                    fontWeight: 700,
                    formatter: (value: unknown) =>
                      typeof value === 'number' ? formatAxisNumber(value) : '',
                  }
                : undefined
            }
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
  )
}
