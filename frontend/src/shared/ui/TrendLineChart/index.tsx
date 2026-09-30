import { type ComponentProps } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '#shared/ui/Chart'

export interface TrendLine {
  /** config 키 = 색 매핑(`var(--color-${key})`) = data row의 dataKey */
  key: string
  /** 기본 2.5 */
  strokeWidth?: number
  /** '' 또는 미지정이면 실선 */
  strokeDasharray?: string
  /** 기본 { r: 4 }, false면 점 숨김 */
  dot?: boolean | { r: number }
}

interface TrendLineChartProps {
  config: ChartConfig
  data: Array<Record<string, string | number>>
  lines: TrendLine[]
  yTickFormatter: (value: number | string) => string
  tooltipFormatter?: ComponentProps<typeof ChartTooltipContent>['formatter']
  /** x축 dataKey (기본 'month') */
  xKey?: string
  className?: string
  /** 각 점에 값 라벨 표시 (월간 레포트 차트와 동일한 방식). 기본 false */
  showValueLabels?: boolean
}

/**
 * 통계 Trend 라인차트 공용 골격 (ChartContainer + LineChart).
 * Card·헤더·PanelShell은 페이지가 소유한다 — 헤더가 패널마다 다르기 때문(단순 vs 지표 토글).
 * 색은 config 키 기준 `var(--color-${line.key})`로 자동 매핑.
 */
export function TrendLineChart({
  config,
  data,
  lines,
  yTickFormatter,
  tooltipFormatter,
  xKey = 'month',
  className = 'h-80 w-full',
  showValueLabels = false,
}: TrendLineChartProps) {
  // 값 라벨(월간 레포트 ReportLineChart와 동일 방식):
  //  ① 정점(이웃 평균보다 큼)은 점 위, 골은 점 아래 → 라벨이 선 바깥으로 빠져 겹침이 줄어든다
  //  ② 흰색 헤일로(stroke + paint-order)로 다른 선 위에 겹쳐도 숫자가 또렷하게 보인다
  const makeLabelRenderer =
    (lineKey: string) =>
    (props: {
      x?: number | string
      y?: number | string
      value?: unknown
      index?: number
    }) => {
      const { value, index } = props
      const x = Number(props.x)
      const y = Number(props.y)
      if (
        typeof value !== 'number' ||
        typeof index !== 'number' ||
        !Number.isFinite(x) ||
        !Number.isFinite(y)
      ) {
        return <g />
      }
      const series = data.map((row) => row[lineKey])
      const neighbors = [series[index - 1], series[index + 1]].filter(
        (v): v is number => typeof v === 'number',
      )
      const avg = neighbors.length
        ? neighbors.reduce((a, b) => a + b, 0) / neighbors.length
        : value
      const above = value >= avg
      return (
        <text
          x={x}
          y={y + (above ? -10 : 17)}
          textAnchor="middle"
          fontSize={11}
          fontWeight={700}
          fill={`var(--color-${lineKey})`}
          stroke="#ffffff"
          strokeWidth={3}
          strokeLinejoin="round"
          style={{ paintOrder: 'stroke' }}
        >
          {yTickFormatter(value)}
        </text>
      )
    }

  return (
    <ChartContainer config={config} className={className}>
      {/* 라벨 표시 시 상단 라벨이 잘리지 않도록 위쪽 여백 확보 */}
      <LineChart data={data} margin={showValueLabels ? { top: 20 } : undefined}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey={xKey}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={yTickFormatter}
        />
        <ChartLegend content={<ChartLegendContent />} />
        <ChartTooltip
          content={<ChartTooltipContent formatter={tooltipFormatter} />}
        />
        {lines.map((line) => (
          <Line
            key={line.key}
            type="monotone"
            dataKey={line.key}
            stroke={`var(--color-${line.key})`}
            strokeWidth={line.strokeWidth ?? 2.5}
            strokeDasharray={line.strokeDasharray || undefined}
            dot={line.dot ?? { r: 4 }}
            activeDot={{ r: 6 }}
            label={showValueLabels ? makeLabelRenderer(line.key) : undefined}
          />
        ))}
      </LineChart>
    </ChartContainer>
  )
}
