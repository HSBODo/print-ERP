import {
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts'

import { MONTHS } from '#shared/constants/chart'
import { Card, CardContent, CardHeader, CardTitle } from '#shared/ui/Card'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '#shared/ui/Chart'

/* ── 시력교정 상담성공률 — 전체/원데이/일반 3계열 (당해연도, 라이브) ── */
// pos = 차트 라벨 위치(라인이 겹치지 않게: 상단 원데이↑ / 중간 전체↓ / 하단 일반↓)
const SUCCESS_SERIES: {
  key: 'all' | 'oneday' | 'general'
  label: string
  color: string
  pos: 'top' | 'bottom'
}[] = [
  { key: 'all', label: '전체 성공률', color: '#E11D2E', pos: 'bottom' },
  { key: 'oneday', label: '원데이', color: '#7CB342', pos: 'top' },
  { key: 'general', label: '일반', color: '#5B9BD5', pos: 'bottom' },
]
const successChartConfig: ChartConfig = {
  all: { label: '전체 성공률', color: '#E11D2E' },
  oneday: { label: '원데이', color: '#7CB342' },
  general: { label: '일반', color: '#5B9BD5' },
}

export function ReportSuccessRateChart({
  year,
  all,
  oneday,
  general,
}: {
  year: number
  all: (number | null)[]
  oneday: (number | null)[]
  general: (number | null)[]
}) {
  const series = { all, oneday, general }
  const chartData = MONTHS.map((month, i) => ({
    month,
    all: all[i],
    oneday: oneday[i],
    general: general[i],
  }))
  const pct = (v: number) => `${Math.round(v)}%`
  const avg = (vals: (number | null)[]) => {
    const nums = vals.filter((v): v is number => typeof v === 'number')
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
  }

  return (
    <Card className="report-chart flex break-inside-avoid flex-col border-border/70 shadow-sm">
      <CardHeader className="items-center gap-1 pb-2">
        <CardTitle className="text-center text-lg">
          시력교정 상담성공률
          <span className="text-sm font-medium text-muted-foreground">
            {' '}
            (검사중단/수술불가 제외 · {year}년)
          </span>
        </CardTitle>
        <div className="flex flex-wrap items-center justify-center gap-5 pt-1">
          {SUCCESS_SERIES.map((s) => (
            <span
              key={s.key}
              className="flex items-center gap-1.5 text-sm font-bold"
              style={{ color: s.color }}
            >
              <span
                className="h-[3px] w-7 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ChartContainer
          config={successChartConfig}
          className="report-chart-area aspect-auto h-[480px] w-full"
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
              tickMargin={6}
              domain={[50, 100]}
              ticks={[50, 60, 70, 80, 90, 100]}
              allowDecimals={false}
              tickFormatter={(v) => pct(Number(v))}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            {SUCCESS_SERIES.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
                activeDot={{ r: 4 }}
              >
                <LabelList
                  dataKey={s.key}
                  position={s.pos}
                  offset={10}
                  fontSize={12}
                  fontWeight={700}
                  fill={s.color}
                  formatter={(v) => (typeof v === 'number' ? pct(v) : '')}
                />
              </Line>
            ))}
          </LineChart>
        </ChartContainer>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] table-fixed border-collapse text-center text-xs">
            <colgroup>
              <col className="w-20" />
              {MONTHS.map((m) => (
                <col key={m} />
              ))}
              <col className="w-20" />
            </colgroup>
            <thead>
              <tr className="border-y border-border bg-muted/40">
                <th className="py-1.5" />
                {MONTHS.map((m) => (
                  <th key={m} className="py-1.5 font-semibold text-foreground">
                    {m}
                  </th>
                ))}
                <th className="py-1.5 font-semibold text-foreground">평균</th>
              </tr>
            </thead>
            <tbody>
              {SUCCESS_SERIES.map((s) => {
                const a = avg(series[s.key])
                return (
                  <tr key={s.key} className="border-b border-border">
                    <td
                      className="py-1.5 font-semibold"
                      style={{ color: s.color }}
                    >
                      {s.label}
                    </td>
                    {MONTHS.map((_, i) => {
                      const v = series[s.key][i]
                      return (
                        <td
                          key={i}
                          className="whitespace-nowrap px-2 py-1.5 tabular-nums"
                        >
                          {typeof v === 'number' ? pct(v) : ''}
                        </td>
                      )
                    })}
                    <td className="whitespace-nowrap px-2 py-1.5 font-semibold tabular-nums">
                      {typeof a === 'number' ? pct(a) : ''}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          ※ 운영 DB 라이브. 성공률 = 수술예약 / 상담(검사중단·수술불가 제외).
          전체·원데이는 레거시와 ±1~2%p, 일반은 3월 등 일부 월 ~5%p 차(레거시
          일반 산정 시점차).
        </p>
      </CardContent>
    </Card>
  )
}
