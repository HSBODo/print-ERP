import { Flag } from 'lucide-react'
import { Fragment } from 'react'
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

/** 특정 연도 선의 특정 달 점에 붙일 레이블 목록 (예: 이벤트 노트) */
export interface ChartMonthLabel {
  year: number
  /** 0 = 1월 */
  monthIndex: number
  labels: string[]
}

interface Props {
  chartConfig: ChartConfig
  chartData: ReservationOverallRow[]
  series: ReservationOverallSeries[]
  /** 마커는 값이 있는 점에만, 툴팁에는 그 달이면 항상 */
  annotations?: ChartMonthLabel[]
}

const FLAG_SIZE = 16

/** 이벤트 마커 — 점에 작은 원 + 그 위에 깃발 */
function EventMarker({
  cx = 0,
  cy = 0,
  color,
}: {
  cx?: number
  cy?: number
  color: string
}) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={3} fill={color} />
      <Flag
        x={cx - 3}
        y={cy - FLAG_SIZE - 8}
        width={FLAG_SIZE}
        height={FLAG_SIZE}
        color={color}
        fill={color}
        strokeWidth={2}
      />
    </g>
  )
}

/** 툴팁 제목 — 월 + 그 달 이벤트(연도 색). 값이 없는 달에도 보인다. */
function MonthWithEvents({
  month,
  annotations = [],
  series,
}: {
  month: string
  annotations?: ChartMonthLabel[]
  series: ReservationOverallSeries[]
}) {
  const monthIndex = MONTHS.indexOf(month)
  const events = annotations
    .filter((a) => a.monthIndex === monthIndex)
    .sort((a, b) => a.year - b.year)

  return (
    <div>
      {month}
      {events.length > 0 && (
        <dl className="mt-1.5 grid max-w-72 grid-cols-[auto_1fr] gap-x-1.5 gap-y-0.5 border-t border-border pt-1.5 font-normal break-keep">
          {events.map(({ year, labels }) => (
            <Fragment key={year}>
              <dt
                className="font-semibold"
                style={{ color: series.find((s) => s.year === year)?.color }}
              >
                {year}
              </dt>
              <dd>
                {labels.map((label, i) => (
                  <div key={i}>{label}</div>
                ))}
              </dd>
            </Fragment>
          ))}
        </dl>
      )}
    </div>
  )
}

/** 월별 연도 비교 선 차트 — 최신 연도는 값 레이블(점 아래), annotations 는 점에 깃발 마커 + 툴팁 */
export function ReservationOverallChart({
  chartConfig,
  chartData,
  series,
  annotations,
}: Props) {
  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto min-h-0 w-full flex-1"
    >
      <LineChart data={chartData} margin={{ top: 24, left: 0, right: 80 }}>
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
