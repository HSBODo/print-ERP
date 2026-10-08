import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'

import { MONTHS } from '#shared/constants/chart'
import { Card, CardContent, CardHeader, CardTitle } from '#shared/ui/Card'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '#shared/ui/Chart'
import { formatAxisNumber } from '#shared/utils/stats'

/* ── 고객분류별 검사수 — 내원동기(레포트) 9계열 (당해연도, 라이브) ── */
// 색은 전체 검사자 리스트의 내원동기(레포트) 뱃지 색과 맞춰 두 화면을 같은 색으로 읽게 한다.
// 9계열이라 라인 위 숫자 라벨은 달지 않는다 — 값은 아래 표에서 읽는다.
const EXAM_CLASS_SERIES: { key: string; color: string }[] = [
  { key: '소개고객', color: '#10B981' },
  { key: '소개직원', color: '#8B5CF6' },
  { key: 'B2B(군인)', color: '#6366F1' },
  { key: 'B2B(기업)', color: '#3B82F6' },
  { key: '광고', color: '#F59E0B' },
  { key: '홈페이지', color: '#0EA5E9' },
  { key: '바이럴', color: '#EC4899' },
  { key: '프로모션', color: '#F97316' },
  { key: '기타', color: '#6B7280' },
]

const examClassChartConfig: ChartConfig = Object.fromEntries(
  EXAM_CLASS_SERIES.map((s) => [s.key, { label: s.key, color: s.color }]),
)

export function ReportExamByClassChart({
  year,
  rows,
}: {
  year: number
  rows: { month: number; motiveReport: string; cnt: number }[]
}) {
  // (월 → 분류 → 건수). 응답에 없는 조합은 0, 미래·데이터 없는 월은 null(선 끊김).
  const { chartData, monthTotals } = useMemo(() => {
    const byMonth = new Map<number, Map<string, number>>()
    for (const r of rows) {
      const m = byMonth.get(r.month) ?? new Map<string, number>()
      m.set(r.motiveReport, (m.get(r.motiveReport) ?? 0) + r.cnt)
      byMonth.set(r.month, m)
    }
    const data = MONTHS.map((month, i) => {
      const found = byMonth.get(i + 1)
      const row: Record<string, string | number | null> = { month }
      for (const s of EXAM_CLASS_SERIES)
        row[s.key] = found ? (found.get(s.key) ?? 0) : null
      return row
    })
    const totals = MONTHS.map((_, i) => {
      const found = byMonth.get(i + 1)
      if (!found) return null
      return [...found.values()].reduce((a, b) => a + b, 0)
    })
    return { chartData: data, monthTotals: totals }
  }, [rows])

  if (!rows.length) return null

  const seriesTotal = (key: string) =>
    chartData.reduce(
      (sum, row) => sum + (typeof row[key] === 'number' ? row[key] : 0),
      0,
    )
  const cell = (v: number | null) =>
    typeof v === 'number' ? formatAxisNumber(v) : ''

  return (
    <Card className="report-chart flex break-inside-avoid flex-col border-border/70 shadow-sm">
      <CardHeader className="items-center gap-1 pb-2">
        <CardTitle className="text-center text-lg">
          고객분류별 검사수
          <span className="text-sm font-medium text-muted-foreground">
            {' '}
            (내원동기 기준 · {year}년)
          </span>
        </CardTitle>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-1">
          {EXAM_CLASS_SERIES.map((s) => (
            <span
              key={s.key}
              className="flex items-center gap-1.5 text-[13px] font-bold"
              style={{ color: s.color }}
            >
              <span
                className="h-[3px] w-6 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.key}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ChartContainer
          config={examClassChartConfig}
          className="report-chart-area aspect-auto h-[480px] w-full"
        >
          <LineChart data={chartData} margin={{ top: 24, left: 0, right: 24 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              scale="band"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              width={56}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              tickFormatter={(v) => formatAxisNumber(Number(v))}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            {EXAM_CLASS_SERIES.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ChartContainer>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] table-fixed border-collapse text-center text-xs">
            <colgroup>
              <col className="w-24" />
              {MONTHS.map((m) => (
                <col key={m} />
              ))}
              <col className="w-20" />
            </colgroup>
            <thead>
              <tr className="border-y border-border bg-muted/40">
                <th className="py-1.5" />
                {MONTHS.map((m) => (
                  <th
                    key={m}
                    className="py-1.5 pr-2 text-right font-semibold text-foreground"
                  >
                    {m}
                  </th>
                ))}
                <th className="py-1.5 pr-2 text-right font-semibold text-foreground">
                  합계
                </th>
              </tr>
            </thead>
            <tbody>
              {EXAM_CLASS_SERIES.map((s) => (
                <tr key={s.key} className="border-b border-border">
                  <td
                    className="py-1.5 text-left font-semibold"
                    style={{ color: s.color }}
                  >
                    {s.key}
                  </td>
                  {chartData.map((row, i) => (
                    <td key={i} className="py-1.5 pr-2 text-right tabular-nums">
                      {cell(row[s.key] as number | null)}
                    </td>
                  ))}
                  <td className="py-1.5 pr-2 text-right font-semibold tabular-nums">
                    {formatAxisNumber(seriesTotal(s.key))}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                <td className="py-1.5 text-left">합계</td>
                {monthTotals.map((v, i) => (
                  <td key={i} className="py-1.5 pr-2 text-right tabular-nums">
                    {cell(v)}
                  </td>
                ))}
                <td className="py-1.5 pr-2 text-right tabular-nums">
                  {formatAxisNumber(
                    monthTotals.reduce((a: number, b) => a + (b ?? 0), 0),
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
