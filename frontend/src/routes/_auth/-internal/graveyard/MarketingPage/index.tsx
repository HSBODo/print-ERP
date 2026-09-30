import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#shared/ui/Card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '#shared/ui/Chart'
import { StatsSelect, TrendChip } from '#shared/ui/StatsPrimitives'
import { changePoint, changeRate, formatDelta } from '#shared/utils/statsUtils'
import {
  formatAxisNumber,
  formatAxisPercent,
  getCurrentPeriod,
} from '#shared/utils/stats'

type ChannelKey = 'search' | 'meta' | 'content' | 'referral'

interface MonthlyData {
  gaConversions: number
  adminDb: number
  tmConversionRate: number
  rssReservations: number
  crmReservations: number
  channels: Record<ChannelKey, number>
}

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 10 }, (_, index) => CURRENT_YEAR - index)
const CURRENT_PERIOD = getCurrentPeriod()
const DEFAULT_YEAR = YEARS.includes(CURRENT_PERIOD.year)
  ? CURRENT_PERIOD.year
  : YEARS[0]
const DEFAULT_MONTH = CURRENT_PERIOD.month
const MONTHS = [
  '1월',
  '2월',
  '3월',
  '4월',
  '5월',
  '6월',
  '7월',
  '8월',
  '9월',
  '10월',
  '11월',
  '12월',
]
const yearOptions = YEARS.map((year) => ({ value: year, label: `${year}년` }))
const monthOptions = MONTHS.map((month, index) => ({
  value: index,
  label: month,
}))

const CHANNELS: { key: ChannelKey; label: string; color: string }[] = [
  { key: 'search', label: '검색광고', color: 'var(--chart-1)' },
  { key: 'meta', label: '메타', color: 'var(--chart-3)' },
  { key: 'content', label: '콘텐츠/SEO', color: 'var(--chart-4)' },
  { key: 'referral', label: '제휴/리퍼럴', color: 'var(--chart-5)' },
]

const emptyData = (): MonthlyData => ({
  gaConversions: 0,
  adminDb: 0,
  tmConversionRate: 0,
  rssReservations: 0,
  crmReservations: 0,
  channels: { search: 0, meta: 0, content: 0, referral: 0 },
})

const buildChannelMix = (
  gaConversions: number,
  monthIndex: number,
  yearDelta: number,
) => {
  const search = Math.max(
    0,
    Math.round(
      gaConversions * (0.37 + Math.sin(monthIndex * 0.45 + 0.3) * 0.03) +
        yearDelta * 3,
    ),
  )
  const meta = Math.max(
    0,
    Math.round(
      gaConversions * (0.24 + Math.cos(monthIndex * 0.4 + 1.2) * 0.025) +
        yearDelta * 2,
    ),
  )
  const content = Math.max(
    0,
    Math.round(
      gaConversions * (0.19 + Math.sin(monthIndex * 0.38 + 0.9) * 0.02) +
        yearDelta * 2,
    ),
  )

  return {
    search,
    meta,
    content,
    referral: Math.max(0, gaConversions - search - meta - content),
  }
}

const buildYearData = (year: number): MonthlyData[] => {
  const yearDelta = year - 2024

  return MONTHS.map((_, monthIndex) => {
    const gaConversions = Math.max(
      160,
      Math.round(
        228 +
          yearDelta * 24 +
          Math.sin((monthIndex / 12) * Math.PI * 2 + 0.2) * 26 +
          (monthIndex === 4 || monthIndex === 9 ? 18 : 0),
      ),
    )
    const adminDb = Math.max(
      110,
      Math.round(gaConversions * (0.58 + yearDelta * 0.01)),
    )

    return {
      gaConversions,
      adminDb,
      tmConversionRate: Number(
        (
          23 +
          yearDelta * 1.1 +
          Math.cos((monthIndex / 12) * Math.PI * 2 + 0.7) * 2.3
        ).toFixed(1),
      ),
      rssReservations: Math.max(
        34,
        Math.round(adminDb * (0.24 + Math.sin(monthIndex * 0.5 + 0.3) * 0.02)),
      ),
      crmReservations: Math.max(
        28,
        Math.round(adminDb * (0.18 + Math.cos(monthIndex * 0.4 + 0.9) * 0.02)),
      ),
      channels: buildChannelMix(gaConversions, monthIndex, yearDelta),
    }
  })
}

const mockData = Object.fromEntries(
  YEARS.map((year) => [year, buildYearData(year)]),
) as Record<number, MonthlyData[]>

const trendConfig = {
  gaConversions: { label: 'GA 전환 수', color: 'var(--chart-1)' },
  adminDb: { label: '어드민 DB 수', color: 'var(--chart-3)' },
  rssReservations: { label: '예약수(RSS)', color: 'var(--chart-4)' },
  crmReservations: { label: '예약수(CRM)', color: 'var(--chart-5)' },
} satisfies ChartConfig

const funnelConfig = {
  previous: { label: '직전 기준', color: '#cbd5e1' },
  current: { label: '선택 기준', color: 'var(--chart-1)' },
} satisfies ChartConfig

const channelConfig = Object.fromEntries(
  CHANNELS.map((channel) => [
    channel.key,
    {
      label: channel.label,
      color: channel.color,
    },
  ]),
) satisfies ChartConfig

const tmConfig = {
  tmConversionRate: { label: 'TM DB 전환율', color: '#0f766e' },
} satisfies ChartConfig

export function MarketingPage() {
  const [selectedYear, setSelectedYear] = useState(DEFAULT_YEAR)
  const [selectedMonth, setSelectedMonth] = useState(DEFAULT_MONTH)

  const currentData = mockData[selectedYear]?.[selectedMonth] ?? emptyData()
  const previousData =
    selectedMonth > 0
      ? (mockData[selectedYear]?.[selectedMonth - 1] ?? emptyData())
      : (mockData[selectedYear - 1]?.[11] ?? emptyData())

  const summaryItems = [
    {
      key: 'gaConversions',
      title: 'GA 전환 수',
      value: `${currentData.gaConversions.toLocaleString()}건`,
      caption: '웹/캠페인 전환 수',
      change: changeRate(previousData.gaConversions, currentData.gaConversions),
      suffix: '%',
    },
    {
      key: 'adminDb',
      title: '어드민 DB 수',
      value: `${currentData.adminDb.toLocaleString()}건`,
      caption: '실제 확보된 마케팅 DB',
      change: changeRate(previousData.adminDb, currentData.adminDb),
      suffix: '%',
    },
    {
      key: 'tmConversionRate',
      title: 'TM DB 전환율',
      value: `${currentData.tmConversionRate.toFixed(1)}%`,
      caption: 'TM DB 기준 전환 효율',
      change: changePoint(
        previousData.tmConversionRate,
        currentData.tmConversionRate,
      ),
      suffix: '%p',
    },
    {
      key: 'rssReservations',
      title: '예약수(RSS)',
      value: `${currentData.rssReservations.toLocaleString()}건`,
      caption: 'RSS 경로 예약 유입',
      change: changeRate(
        previousData.rssReservations,
        currentData.rssReservations,
      ),
      suffix: '%',
    },
    {
      key: 'crmReservations',
      title: '예약수(CRM)',
      value: `${currentData.crmReservations.toLocaleString()}건`,
      caption: 'CRM 경로 예약 유입',
      change: changeRate(
        previousData.crmReservations,
        currentData.crmReservations,
      ),
      suffix: '%',
    },
  ]

  const trendData = useMemo(
    () =>
      MONTHS.map((month, index) => ({
        month,
        gaConversions: mockData[selectedYear]?.[index]?.gaConversions ?? 0,
        adminDb: mockData[selectedYear]?.[index]?.adminDb ?? 0,
        rssReservations: mockData[selectedYear]?.[index]?.rssReservations ?? 0,
        crmReservations: mockData[selectedYear]?.[index]?.crmReservations ?? 0,
      })),
    [selectedYear],
  )

  const funnelData = [
    {
      stage: 'GA 전환',
      previous: previousData.gaConversions,
      current: currentData.gaConversions,
    },
    {
      stage: '어드민 DB',
      previous: previousData.adminDb,
      current: currentData.adminDb,
    },
    {
      stage: '예약수(RSS)',
      previous: previousData.rssReservations,
      current: currentData.rssReservations,
    },
    {
      stage: '예약수(CRM)',
      previous: previousData.crmReservations,
      current: currentData.crmReservations,
    },
  ]

  const channelData = CHANNELS.map((channel) => ({
    key: channel.key,
    name: channel.label,
    value: currentData.channels[channel.key],
    fill: channel.color,
  }))

  const tmTrendData = useMemo(
    () =>
      MONTHS.map((month, index) => ({
        month,
        tmConversionRate:
          mockData[selectedYear]?.[index]?.tmConversionRate ?? 0,
      })),
    [selectedYear],
  )

  const totalChannels = channelData.reduce((sum, item) => sum + item.value, 0)
  const topChannel = [...channelData].sort(
    (left, right) => right.value - left.value,
  )[0]
  const totalReservations =
    currentData.rssReservations + currentData.crmReservations

  return (
    <div className="space-y-6">
      {/* 예약통계 툴바 규격: flat white · px-2 py-1.5 · text-xs */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-white px-2 py-1.5 text-xs shadow-sm">
        <div className="flex h-8 items-center rounded-md bg-gray-100 px-3 text-xs font-medium text-gray-700">
          마케팅 유입 및 효율 지표
        </div>
        <div className="h-5 w-px bg-gray-200" />
        <StatsSelect
          value={selectedYear}
          onChange={setSelectedYear}
          options={yearOptions}
          title="연도 선택"
        />
        <StatsSelect
          value={selectedMonth}
          onChange={setSelectedMonth}
          options={monthOptions}
          title="월 선택"
        />
        <span className="ml-auto text-xs text-muted-foreground">
          {selectedYear}년 {MONTHS[selectedMonth]} 기준
        </span>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summaryItems.map((item) => (
          <Card key={item.key} className="gap-2 border-border/70 shadow-sm">
            <CardHeader className="gap-0.5 pb-0">
              <CardTitle className="text-base font-semibold text-gray-900">
                {item.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <p className="text-3xl font-semibold tracking-tight text-gray-900">
                {item.value}
              </p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">{item.caption}</p>
                <TrendChip value={item.change} suffix={item.suffix} />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>월별 마케팅 유입/예약 추이</CardTitle>
            <CardDescription>
              GA 전환, DB 확보, 예약 유입까지 한 흐름으로 비교합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trendConfig} className="h-80 w-full">
              <LineChart data={trendData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={formatAxisNumber}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="gaConversions"
                  stroke="var(--color-gaConversions)"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="adminDb"
                  stroke="var(--color-adminDb)"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="rssReservations"
                  stroke="var(--color-rssReservations)"
                  strokeWidth={2.25}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="crmReservations"
                  stroke="var(--color-crmReservations)"
                  strokeWidth={2.25}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>채널별 리드 분포</CardTitle>
            <CardDescription>
              {topChannel?.name ?? '-'} 채널이 가장 큰 비중을 차지합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ChartContainer
              config={channelConfig}
              className="mx-auto h-72 w-full max-w-[320px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={channelData}
                  dataKey="value"
                  nameKey="key"
                  innerRadius={62}
                  outerRadius={96}
                  paddingAngle={4}
                  strokeWidth={3}
                >
                  {channelData.map((entry) => (
                    <Cell key={entry.key} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="space-y-2 text-sm">
              {channelData.map((entry) => (
                <div
                  key={entry.key}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: entry.fill }}
                  />
                  <span>{entry.name}</span>
                  <span className="ml-auto font-medium text-foreground">
                    {totalChannels
                      ? ((entry.value / totalChannels) * 100).toFixed(1)
                      : '0.0'}
                    %
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>전환 퍼널 비교</CardTitle>
            <CardDescription>
              직전 기준 대비 어느 구간에서 낙폭 또는 성장이 있었는지 확인합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={funnelConfig} className="h-80 w-full">
              <BarChart data={funnelData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="stage"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={formatAxisNumber}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="previous"
                  fill="var(--color-previous)"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                />
                <Bar
                  dataKey="current"
                  fill="var(--color-current)"
                  radius={[4, 4, 0, 0]}
                  barSize={18}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>TM 효율 요약</CardTitle>
            <CardDescription>
              TM DB 전환율과 예약 총량을 함께 봅니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-900">
                선택 월 TM DB 전환율
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                {currentData.tmConversionRate.toFixed(1)}%
              </p>
              <p className="mt-1 text-sm text-gray-600">
                직전 기준 대비{' '}
                {formatDelta(
                  changePoint(
                    previousData.tmConversionRate,
                    currentData.tmConversionRate,
                  ),
                  '%p',
                )}
              </p>
            </div>
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-900">예약 총량</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
                {totalReservations.toLocaleString()}건
              </p>
              <p className="mt-1 text-sm text-gray-600">
                RSS + CRM 예약 유입 합산
              </p>
            </div>
            <ChartContainer config={tmConfig} className="h-52 w-full">
              <LineChart data={tmTrendData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={formatAxisPercent}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => `${Number(value).toFixed(1)}%`}
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="tmConversionRate"
                  stroke="var(--color-tmConversionRate)"
                  strokeWidth={2.5}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
