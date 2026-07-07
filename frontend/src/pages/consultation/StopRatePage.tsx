import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { FilterBar } from '@/components/filters/FilterBar'
import { useFilterBar } from '@/components/filters/useFilterBar'
import { PanelShell } from '@/components/PanelShell'
import { useOverallExamWeekly } from '@/hooks/overall/useOverallExamWeekly'
import { MONTHLY_LEGACY_CHARTS } from '@/data/monthlyReportLegacy'
import { CURRENT_YEAR, MONTHS } from '@/constants/chart'

const RECENCY_COLORS = ['#E11D2E', '#4B5563', '#A8CEDF', '#F59E0B']

// 2024·2025 확정값 + 2026 1~4월 확정값(나머지 월은 null → 운영 DB 라이브). 월간레포트와 동일 소스.
const LEGACY_STOP_RATE = MONTHLY_LEGACY_CHARTS['stop-rate'].data

const Y_AXIS_DOMAIN: [number, number] = [0, 10]
const Y_AXIS_TICKS = [0, 2, 4, 6, 8, 10]

const formatPercent = (value: number | null) =>
  typeof value === 'number' ? `${value.toFixed(1)}%` : ''

const now = new Date()
const isFutureMonth = (year: number, monthIndex: number) =>
  year > now.getFullYear() ||
  (year === now.getFullYear() && monthIndex > now.getMonth())

export function StopRatePage() {
  const filter = useFilterBar('year', [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR])
  const sortedYears = useMemo(() => [...filter.years].sort((a, b) => a - b), [filter.years])
  // 라이브 계산이 필요한 연도(2026~): overall-exam 주간을 월별로 합산해 분자·분모를 만든다.
  const liveYears = useMemo(() => sortedYears.filter((year) => year >= 2026), [sortedYears])

  const overall = useOverallExamWeekly(liveYears)

  // 연·월별 {stopCount, visionExam} 합산 (당해연도 라이브 중단율의 분자·분모)
  const monthlySums = useMemo(() => {
    const acc: Record<number, Array<{ stopCount: number; visionExam: number }>> = {}
    for (const it of overall.items) {
      const rows =
        acc[it.year] ?? Array.from({ length: 12 }, () => ({ stopCount: 0, visionExam: 0 }))
      rows[it.month - 1].stopCount += it.stopCount
      rows[it.month - 1].visionExam += it.visionExam
      acc[it.year] = rows
    }
    return acc
  }, [overall.items])

  const series = useMemo(() => {
    const latestYear = sortedYears[sortedYears.length - 1]
    return sortedYears.map((year, index) => ({
      year,
      key: `y${year}`,
      color: RECENCY_COLORS[Math.min(sortedYears.length - 1 - index, RECENCY_COLORS.length - 1)],
      isLatest: year === latestYear,
    }))
  }, [sortedYears])

  const yearChipColors = useMemo(() => {
    const map: Record<number, string> = {}
    series.forEach((item) => {
      map[item.year] = item.color
    })
    return map
  }, [series])

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {}
    series.forEach(({ year, color }) => {
      config[`y${year}`] = { label: `${year}`, color }
    })
    return config
  }, [series])

  const chartData = useMemo(
    () =>
      MONTHS.map((month, monthIndex) => {
        const row: Record<string, string | number | null> = { month }
        sortedYears.forEach((year) => {
          // 확정값(2024·2025 전월, 2026 1~4월) 우선, 없으면 당해연도 라이브 계산
          const confirmed = LEGACY_STOP_RATE[year]?.[monthIndex]
          if (typeof confirmed === 'number') {
            row[`y${year}`] = confirmed
            return
          }
          const sums = year >= 2026 && !isFutureMonth(year, monthIndex)
            ? monthlySums[year]?.[monthIndex]
            : undefined
          row[`y${year}`] =
            sums && sums.visionExam > 0 ? (sums.stopCount / sums.visionExam) * 100 : null
        })
        return row
      }),
    [sortedYears, monthlySums],
  )

  const isLoading = liveYears.length > 0 && overall.isLoading
  const isError = liveYears.length > 0 && overall.isError

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[40rem] flex-col gap-6">
      <FilterBar {...filter} yearOnly yearChipColors={yearChipColors} />
      <PanelShell isLoading={isLoading} isError={isError} variant="line" className="flex min-h-0 flex-1 flex-col">
        <Card className="flex min-h-0 flex-1 flex-col border-border/70 shadow-sm">
          <CardHeader className="space-y-3">
            <div>
              <CardTitle>월별 추이 비교</CardTitle>
              <CardDescription>
                중단율 (검사 중단 / 시력교정 검사자). 시력교정 검사자 대비 검사 중단(STOP_YN) 건 비율입니다.
                2024·2025 및 2026년 1~4월은 확정값, 이후 달은 운영 DB 라이브입니다.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {series.map(({ year, color, isLatest }) => (
                <span
                  key={year}
                  className="flex items-center gap-2 text-sm font-bold"
                  style={{ color: isLatest ? color : '#374151' }}
                >
                  <span className="h-[3px] w-8 rounded-full" style={{ backgroundColor: color }} />
                  {year}
                </span>
              ))}
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
            <ChartContainer config={chartConfig} className="aspect-auto min-h-0 w-full flex-1">
              {/* left/right 여백과 YAxis 폭을 테이블 colgroup(80px)과 맞춰 월 라벨이 표 컬럼 중앙에 정렬됨 */}
              <LineChart data={chartData} margin={{ top: 24, left: 0, right: 80 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" scale="band" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis
                  width={80}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  domain={Y_AXIS_DOMAIN}
                  ticks={Y_AXIS_TICKS}
                  tickFormatter={(value) => `${value}%`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <>
                          <span className="text-muted-foreground">{chartConfig[String(name)]?.label}</span>
                          <span className="ml-auto font-mono font-semibold text-foreground">
                            {formatPercent(typeof value === 'number' ? value : null)}
                          </span>
                        </>
                      )}
                    />
                  }
                />
                {series.map(({ key, color, isLatest }) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    strokeWidth={isLatest ? 3 : 2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                    connectNulls={false}
                    label={
                      isLatest
                        ? {
                            position: 'bottom',
                            offset: 16,
                            fill: color,
                            fontSize: 14,
                            fontWeight: 700,
                            formatter: (value: unknown) =>
                              formatPercent(typeof value === 'number' ? value : null),
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
                      <th key={month} className="py-2 font-semibold text-foreground">
                        {month}
                      </th>
                    ))}
                    <th className="py-2 font-semibold text-foreground">평균</th>
                  </tr>
                </thead>
                <tbody>
                  {series.map(({ year, key, color, isLatest }) => {
                    const values = chartData
                      .map((row) => row[key])
                      .filter((value): value is number => typeof value === 'number')
                    const average = values.length
                      ? values.reduce((sum, value) => sum + value, 0) / values.length
                      : null

                    return (
                      <tr key={year} className="border-b border-border">
                        <td className="py-2">
                          <span
                            className="flex items-center justify-center gap-1.5 font-semibold"
                            style={{ color: isLatest ? color : undefined }}
                          >
                            <span className="h-[3px] w-5 rounded-full" style={{ backgroundColor: color }} />
                            {year}
                          </span>
                        </td>
                        {MONTHS.map((month, monthIndex) => {
                          const value = chartData[monthIndex]?.[key]
                          return (
                            <td key={`${year}-${month}`} className="py-2 tabular-nums">
                              {formatPercent(typeof value === 'number' ? value : null)}
                            </td>
                          )
                        })}
                        <td className="py-2 font-semibold tabular-nums">{formatPercent(average)}</td>
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
