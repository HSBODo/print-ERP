import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#shared/ui/Card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '#shared/ui/Chart'
import { FilterBar } from '#shared/ui/FilterBar'
import { useFilterBar } from '#shared/ui/FilterBar/useFilterBar'
import { PanelShell } from '#shared/ui/PanelShell'
import { useCataractReservationRateTrend } from '../../hooks/useCataractReservationRateTrend'
import { CURRENT_YEAR, MONTHS } from '#shared/constants/chart'

const RECENCY_COLORS = ['#E11D2E', '#4B5563', '#A8CEDF', '#F59E0B']

type RateTabKey = 'vision' | 'cataract'

const RATE_TABS: {
  key: RateTabKey
  label: string
  title: string
  description: string
}[] = [
  {
    key: 'vision',
    label: '시력교정 예약률',
    title: '시력교정 예약률 (수술예약건/검사자)',
    description: '시력교정 검사자 대비 수술예약건 비율입니다.',
  },
  {
    key: 'cataract',
    label: '백내장 예약률',
    title: '백내장 예약률 (수술예약건/백내장 진단자)',
    description:
      '백내장 검사 결과 좌·우 중 한쪽 이상 백내장으로 진단된 사람 대비 수술예약자 비율입니다.',
  },
]

const formatPercent = (value: number | null) =>
  typeof value === 'number' ? `${Math.ceil(value)}%` : ''

const now = new Date()
const isFutureMonth = (year: number, monthIndex: number) =>
  year > now.getFullYear() ||
  (year === now.getFullYear() && monthIndex > now.getMonth())

export function CataractReservationRatePage() {
  const filter = useFilterBar('year', [
    CURRENT_YEAR - 2,
    CURRENT_YEAR - 1,
    CURRENT_YEAR,
  ])
  const [tab, setTab] = useState<RateTabKey>('vision')
  const sortedYears = useMemo(
    () => [...filter.years].sort((a, b) => a - b),
    [filter.years],
  )

  const rateQuery = useCataractReservationRateTrend(sortedYears, tab)

  const series = useMemo(() => {
    const latestYear = sortedYears[sortedYears.length - 1]
    return sortedYears.map((year, index) => ({
      year,
      key: `y${year}`,
      color:
        RECENCY_COLORS[
          Math.min(sortedYears.length - 1 - index, RECENCY_COLORS.length - 1)
        ],
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
          const item = rateQuery.dataMap[year]?.[monthIndex]
          row[`y${year}`] =
            isFutureMonth(year, monthIndex) || !item?.examCount
              ? null
              : Math.ceil(item.reservationRate)
        })
        return row
      }),
    [sortedYears, rateQuery.dataMap],
  )

  const activeTab = RATE_TABS.find((item) => item.key === tab) ?? RATE_TABS[0]
  const yAxisDomain: [number, number] = tab === 'vision' ? [55, 90] : [40, 100]
  const yAxisTicks =
    tab === 'vision'
      ? [55, 60, 65, 70, 75, 80, 85, 90]
      : [40, 50, 60, 70, 80, 90, 100]
  const isLoading = rateQuery.isLoading
  const isError = rateQuery.isError

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[40rem] flex-col gap-6">
      <FilterBar {...filter} yearOnly yearChipColors={yearChipColors} />
      <PanelShell
        isLoading={isLoading}
        isError={isError}
        variant="line"
        className="flex min-h-0 flex-1 flex-col"
      >
        <Card className="flex min-h-0 flex-1 flex-col border-border/70 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>월별 추이 비교</CardTitle>
                <CardDescription>
                  {activeTab.title}. {activeTab.description}
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-1 rounded-md bg-gray-100 p-1">
                {RATE_TABS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setTab(item.key)}
                    className={`h-8 rounded px-3 text-sm font-medium transition-colors ${
                      tab === item.key
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {series.map(({ year, color, isLatest }) => (
                <span
                  key={year}
                  className="flex items-center gap-2 text-sm font-bold"
                  style={{ color: isLatest ? color : '#374151' }}
                >
                  <span
                    className="h-[3px] w-8 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {year}
                </span>
              ))}
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
            <ChartContainer
              config={chartConfig}
              className="aspect-auto min-h-0 w-full flex-1"
            >
              {/* left/right 여백과 YAxis 폭을 테이블 colgroup(80px)과 맞춰 월 라벨이 표 컬럼 중앙에 정렬됨 */}
              <LineChart
                data={chartData}
                margin={{ top: 24, left: 0, right: 80 }}
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
                  domain={yAxisDomain}
                  ticks={yAxisTicks}
                  tickFormatter={(value) => `${value}%`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <>
                          <span className="text-muted-foreground">
                            {chartConfig[String(name)]?.label}
                          </span>
                          <span className="ml-auto font-mono font-semibold text-foreground">
                            {formatPercent(
                              typeof value === 'number' ? value : null,
                            )}
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
                              formatPercent(
                                typeof value === 'number' ? value : null,
                              ),
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
                      <th
                        key={month}
                        className="py-2 font-semibold text-foreground"
                      >
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
                      .filter(
                        (value): value is number => typeof value === 'number',
                      )
                    const average = values.length
                      ? Math.ceil(
                          values.reduce((sum, value) => sum + value, 0) /
                            values.length,
                        )
                      : null

                    return (
                      <tr key={year} className="border-b border-border">
                        <td className="py-2">
                          <span
                            className="flex items-center justify-center gap-1.5 font-semibold"
                            style={{ color: isLatest ? color : undefined }}
                          >
                            <span
                              className="h-[3px] w-5 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            {year}
                          </span>
                        </td>
                        {MONTHS.map((month, monthIndex) => {
                          const value = chartData[monthIndex]?.[key]
                          return (
                            <td
                              key={`${year}-${month}`}
                              className="py-2 tabular-nums"
                            >
                              {formatPercent(
                                typeof value === 'number' ? value : null,
                              )}
                            </td>
                          )
                        })}
                        <td className="py-2 font-semibold tabular-nums">
                          {formatPercent(average)}
                        </td>
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
