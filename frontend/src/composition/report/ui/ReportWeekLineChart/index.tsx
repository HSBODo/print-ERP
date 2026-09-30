import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '#shared/ui/Card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '#shared/ui/Chart'
import { formatAxisNumber } from '#shared/utils/stats'
import { niceAxisFor, tightAxis } from '../../utils/niceAxis'
import { colorOf } from '../../utils/reportYearColors'
import type { ReportWeek } from '../../utils/reportWeeks'

/**
 * 주차축 레포트 라인차트 — `ReportLineChart`(월축)의 주차 버전.
 *
 * - 주차 수가 많으면(전체 52/53주) 압축 모드: 눈금은 숫자만, 데이터 라벨 생략
 * - 월별 선택(4~6주)이면 상세 모드: "31주 / 7/27~8/2" 2줄 눈금 + 최신연도 데이터 라벨
 * - 하단 표는 기본 27주씩 끊어 렌더(전체 보기에서 가로 폭 유지 · PDF 인쇄 대응)
 * - `singleTable`이면 52/53주를 한 표에 압축해 렌더한다.
 */

const CHUNK = 27
/** 압축 모드 전환 기준(주차 개수) */
const COMPACT_FROM = 12
const CROSS_MONTH_COLOR = '#B45309'

export interface ReportWeekLineChartProps {
  title: string
  /** 제목 옆 작은 부제 (예: "(소개 제외)") */
  suffix?: string
  years: number[]
  /** year → 주차 값 배열 (weeks 와 같은 길이/순서) */
  data: Record<number, (number | null)[]>
  weeks: ReportWeek[]
  format?: 'number' | 'percent'
  percentFractionDigits?: number
  yDomain?: [number, number]
  /** 전체 주차를 분할하지 않고 한 표에 표시한다. */
  singleTable?: boolean
}

export function ReportWeekLineChart({
  title,
  suffix,
  years,
  data,
  weeks,
  format = 'number',
  percentFractionDigits,
  yDomain,
  singleTable = false,
}: ReportWeekLineChartProps) {
  const sorted = useMemo(() => [...years].sort((a, b) => a - b), [years])
  const latest = sorted[sorted.length - 1]
  const compact = weeks.length > COMPACT_FROM
  const denseTable = singleTable && weeks.length > CHUNK

  const fmt = (v: number) => {
    if (format !== 'percent') return formatAxisNumber(v)
    if (typeof percentFractionDigits === 'number')
      return `${v.toFixed(percentFractionDigits)}%`
    return `${Math.round(v)}%`
  }

  // 우측 합계 칼럼 — 숫자=합계 / 퍼센트=평균
  const summarize = (year: number, from: number, to: number): number | null => {
    const vals = (data[year] ?? [])
      .slice(from, to)
      .filter((v): v is number => typeof v === 'number')
    if (!vals.length) return null
    const sum = vals.reduce((a, b) => a + b, 0)
    return format === 'percent' ? sum / vals.length : sum
  }

  const chartConfig = useMemo<ChartConfig>(() => {
    const config: ChartConfig = {}
    sorted.forEach((y) => {
      config[`y${y}`] = { label: `${y}`, color: colorOf(y, latest) }
    })
    return config
  }, [sorted, latest])

  const chartData = useMemo(
    () =>
      weeks.map((w, i) => {
        const row: Record<string, string | number | null> = {
          w: `${w.label} (${w.rangeLabel})`,
        }
        sorted.forEach((y) => {
          row[`y${y}`] = data[y]?.[i] ?? null
        })
        return row
      }),
    [sorted, data, weeks],
  )

  // 기본은 27주씩 끊고, 단일 표 옵션은 선택한 전체 주차를 한 청크로 만든다.
  const chunks = useMemo(() => {
    const out: { w: ReportWeek; i: number }[][] = []
    const chunkSize = singleTable ? Math.max(weeks.length, 1) : CHUNK
    for (let i = 0; i < weeks.length; i += chunkSize) {
      out.push(weeks.slice(i, i + chunkSize).map((w, k) => ({ w, i: i + k })))
    }
    return out
  }, [weeks, singleTable])

  // 주차는 값의 오르내림을 읽는 게 목적이라 tightAxis(여백 8%·8등분·0 스냅 최소화)를 쓴다.
  // niceAxis 는 여백 15% + 하한 0 스냅이라 주 단위 값에서는 데이터가 축 절반에만 몰린다.
  const { domain: axisDomain, ticks: yTicks } = useMemo(() => {
    if (yDomain) return niceAxisFor(yDomain[0], yDomain[1])
    const values: number[] = []
    sorted.forEach((y) =>
      (data[y] ?? []).forEach((v) => {
        if (typeof v === 'number') values.push(v)
      }),
    )
    return tightAxis(values)
  }, [sorted, data, yDomain])

  // X축 눈금: 압축=주차 숫자만 / 상세=주차 + 날짜범위 2줄. 월 경계 주차는 주황으로 구분.
  const renderTick = (props: {
    x?: number | string
    y?: number | string
    payload?: { index?: number }
  }) => {
    const wk = weeks[props.payload?.index ?? -1]
    const x = Number(props.x)
    const y = Number(props.y)
    if (!wk || !Number.isFinite(x) || !Number.isFinite(y)) return <g />
    const color = wk.crossMonth ? CROSS_MONTH_COLOR : '#374151'
    if (compact) {
      return (
        <text x={x} y={y + 12} textAnchor="middle" fontSize={10} fill={color}>
          {wk.week}
        </text>
      )
    }
    return (
      <g>
        <text
          x={x}
          y={y + 13}
          textAnchor="middle"
          fontSize={13}
          fontWeight={700}
          fill={color}
        >
          {wk.label}
        </text>
        <text x={x} y={y + 28} textAnchor="middle" fontSize={11} fill="#9CA3AF">
          {wk.rangeLabel}
        </text>
      </g>
    )
  }

  // 최신연도 데이터 라벨 — 상세 모드에서만(압축 모드는 겹쳐서 못 읽음)
  const renderLatestLabel = (props: {
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
    const values = data[latest] ?? []
    const neighbors = [values[index - 1], values[index + 1]].filter(
      (v): v is number => typeof v === 'number',
    )
    const avg = neighbors.length
      ? neighbors.reduce((a, b) => a + b, 0) / neighbors.length
      : value
    const above = value >= avg
    return (
      <text
        x={x}
        y={y + (above ? -12 : 20)}
        textAnchor="middle"
        fontSize={14}
        fontWeight={700}
        fill={colorOf(latest, latest)}
        stroke="#ffffff"
        strokeWidth={3.5}
        strokeLinejoin="round"
        style={{ paintOrder: 'stroke' }}
      >
        {fmt(value)}
      </text>
    )
  }

  const hasCrossMonth = weeks.some((w) => w.crossMonth)

  return (
    <Card className="report-chart flex break-inside-avoid flex-col border-border/70 shadow-sm">
      <CardHeader className="items-center gap-1 pb-2">
        <CardTitle className="text-center text-lg">
          {title}
          <span className="text-sm font-medium text-muted-foreground">
            {' '}
            (주차)
          </span>
          {suffix && (
            <span className="text-sm font-medium text-muted-foreground">
              {' '}
              {suffix}
            </span>
          )}
        </CardTitle>
        <div className="flex flex-wrap items-center justify-center gap-5 pt-1">
          {sorted.map((y) => (
            <span
              key={y}
              className="flex items-center gap-1.5 text-sm font-bold"
              style={{ color: y === latest ? colorOf(y, latest) : '#374151' }}
            >
              <span
                className="h-[3px] w-7 rounded-full"
                style={{ backgroundColor: colorOf(y, latest) }}
              />
              {y}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ChartContainer
          config={chartConfig}
          className="report-chart-area aspect-auto h-[480px] w-full"
        >
          <LineChart data={chartData} margin={{ top: 24, left: 0, right: 80 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="w"
              scale="band"
              tickLine={false}
              axisLine={false}
              interval={0}
              height={compact ? 24 : 46}
              tick={renderTick}
            />
            <YAxis
              width={80}
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              domain={axisDomain}
              ticks={yTicks}
              allowDecimals={false}
              tickFormatter={(v) => fmt(Number(v))}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  valueFormatter={(value) =>
                    typeof value === 'number' ? fmt(value) : String(value)
                  }
                />
              }
            />
            {sorted.map((y) => (
              <Line
                key={y}
                type="monotone"
                dataKey={`y${y}`}
                stroke={colorOf(y, latest)}
                strokeWidth={y === latest ? 3 : 2.5}
                dot={false}
                connectNulls={false}
                activeDot={{ r: 4 }}
                label={!compact && y === latest ? renderLatestLabel : undefined}
              />
            ))}
          </LineChart>
        </ChartContainer>

        {chunks.map((chunk, ci) => (
          <div key={ci} className="overflow-x-auto">
            {chunks.length > 1 && (
              <p className="pb-1 text-[11px] font-semibold text-muted-foreground">
                {chunk[0].w.week}~{chunk[chunk.length - 1].w.week}주
              </p>
            )}
            {/*
             * denseTable(전체 52/53주) 은 화면에서 min-w-[1900px] + text-[13px] 로 넉넉히 벌려 가로 스크롤을 유도한다.
             * 화면 가독성을 살리고, 인쇄는 index.css 의 @media print .report-week-table 압축(min-width 0 + 6.5px)이 담당.
             */}
            <table
              className={
                denseTable
                  ? 'report-week-table w-full min-w-[1900px] table-fixed border-collapse text-center text-[13px]'
                  : 'report-week-table w-full min-w-[840px] table-fixed border-collapse text-center text-[11px]'
              }
            >
              <colgroup>
                <col className={denseTable ? 'w-16' : 'w-16'} />
                {chunk.map((c) => (
                  <col key={c.i} />
                ))}
                <col className={denseTable ? 'w-20' : 'w-16'} />
              </colgroup>
              <thead>
                <tr className="border-y border-border bg-muted/40">
                  <th className="py-1.5" />
                  {chunk.map((c) => (
                    <th
                      key={c.i}
                      className="py-1.5 font-semibold"
                      style={{
                        color: c.w.crossMonth ? CROSS_MONTH_COLOR : undefined,
                      }}
                      title={`${c.w.startDate} ~ ${c.w.endDate}`}
                    >
                      {c.w.week}
                      {c.w.crossMonth && '*'}
                    </th>
                  ))}
                  <th className="py-1.5 font-semibold text-foreground">
                    {format === 'percent' ? '평균' : '합계'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((y) => {
                  const summary = summarize(
                    y,
                    chunk[0].i,
                    chunk[chunk.length - 1].i + 1,
                  )
                  return (
                    <tr key={y} className="border-b border-border">
                      <td
                        className="py-1.5 font-semibold"
                        style={{
                          color: y === latest ? colorOf(y, latest) : undefined,
                        }}
                      >
                        {y}
                      </td>
                      {chunk.map((c) => {
                        const v = data[y]?.[c.i]
                        return (
                          <td key={c.i} className="py-1.5 tabular-nums">
                            {typeof v === 'number' ? fmt(v) : ''}
                          </td>
                        )
                      })}
                      <td className="py-1.5 font-semibold tabular-nums">
                        {typeof summary === 'number' ? fmt(summary) : ''}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}

        {hasCrossMonth && (
          <p className="text-[11px]" style={{ color: CROSS_MONTH_COLOR }}>
            * 월 경계 주차(두 달에 걸침)
          </p>
        )}
      </CardContent>
    </Card>
  )
}
