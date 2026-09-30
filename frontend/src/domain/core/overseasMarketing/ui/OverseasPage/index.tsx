import { useMemo, useState } from 'react'
import { ChevronDown, RotateCcw, Search } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { OverseasMarketingGranularity } from '../../type/api'
import { Button } from '#shared/ui/Button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#shared/ui/Card'
import { useOverseasMarketingStatistics } from '../../hooks/useOverseasMarketing'
import { formatAxisNumber } from '#shared/utils/stats'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 7 }, (_, index) => CURRENT_YEAR - index)

const GRANULARITIES: { value: OverseasMarketingGranularity; label: string }[] =
  [
    { value: 'month', label: '월별' },
    { value: 'week', label: '주차별' },
    { value: 'day', label: '일별' },
  ]
const GRANULARITY_UNIT: Record<OverseasMarketingGranularity, string> = {
  month: '월',
  week: '주차',
  day: '일자',
}

type TabKey = 'flow' | 'revenue' | 'countries' | 'table'
const TABS: {
  key: TabKey
  label: string
  title: string
  description: string
}[] = [
  {
    key: 'flow',
    label: '유입·검사·수술',
    title: '유입·검사·수술',
    description: '해외마케팅 접수부터 실제 검사와 수술까지의 흐름입니다.',
  },
  {
    key: 'revenue',
    label: '매출 구성',
    title: '매출 구성',
    description: '수납 항목을 검사·수술·외래·렌즈로 분류한 기간별 합계입니다.',
  },
  {
    key: 'countries',
    label: '국가별 수술 Top 10',
    title: '국가별 수술 Top 10',
    description: '매칭된 해외고객의 수술 건수 기준입니다.',
  },
  {
    key: 'table',
    label: '매출',
    title: '매출',
    description: '기간별 문의·검사·수술 건수와 매출 상세 표입니다.',
  },
]

const formatWon = (value: number) =>
  `${Math.round(value).toLocaleString('ko-KR')}원`
const formatWonAxis = (value: number) => {
  if (Math.abs(value) >= 100_000_000)
    return `${(value / 100_000_000).toFixed(1)}억`
  if (Math.abs(value) >= 10_000)
    return `${Math.round(value / 10_000).toLocaleString()}만`
  return value.toLocaleString()
}

export function OverseasPage() {
  const [year, setYear] = useState(CURRENT_YEAR)
  const [granularity, setGranularity] =
    useState<OverseasMarketingGranularity>('month')
  const [appliedYear, setAppliedYear] = useState<number | null>(null)
  const [tab, setTab] = useState<TabKey>('flow')
  // 통계는 CRM 병합이 무거우므로 조회 버튼을 눌렀을 때만 요청한다.
  // 연도는 초안(draft)이라 [조회]로 적용하고, 집계 단위는 즉시 반영한다(예약통계 툴바 패턴).
  const statistics = useOverseasMarketingStatistics(
    appliedYear ?? year,
    granularity,
    appliedYear !== null,
  )
  const buckets = statistics.data?.buckets
  const countries = statistics.data?.topCountries ?? []
  const currentTab = TABS.find((item) => item.key === tab) ?? TABS[0]
  const bucketUnit =
    GRANULARITY_UNIT[statistics.data?.granularity ?? granularity]

  const chartData = useMemo(
    () =>
      (buckets ?? []).map((item) => ({
        ...item,
        totalRevenue:
          item.examRevenue +
          item.surgeryRevenue +
          item.outpatientRevenue +
          item.lensRevenue,
      })),
    [buckets],
  )

  const totals = useMemo(
    () =>
      chartData.reduce(
        (sum, item) => ({
          inquiries: sum.inquiries + item.inquiries,
          exams: sum.exams + item.exams,
          surgeries: sum.surgeries + item.surgeries,
          revenue: sum.revenue + item.totalRevenue,
        }),
        { inquiries: 0, exams: 0, surgeries: 0, revenue: 0 },
      ),
    [chartData],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-white px-2 py-1.5 text-xs shadow-sm">
        <strong className="whitespace-nowrap px-1 text-[13px] text-gray-900">
          해외마케팅 통계
        </strong>
        <div className="h-6 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">조회 연도</span>
          <div className="relative">
            <select
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className="h-8 w-[6.4rem] appearance-none rounded border border-input bg-white pl-2 pr-7 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="통계 연도"
            >
              {YEARS.map((option) => (
                <option key={option} value={option}>
                  {option}년
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          </div>
        </div>

        <div className="flex h-8 gap-1 rounded-md bg-gray-100 p-1">
          {GRANULARITIES.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={granularity === option.value}
              onClick={() => setGranularity(option.value)}
              className={`rounded px-3 text-sm font-medium transition-colors ${
                granularity === option.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => {
              setYear(CURRENT_YEAR)
              setGranularity('month')
              setAppliedYear(null)
              setTab('flow')
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            초기화
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={statistics.isFetching}
            className="bg-blue-600 text-xs text-white hover:bg-blue-700"
            onClick={() => setAppliedYear(year)}
          >
            <Search className="h-3.5 w-3.5" />
            조회
          </Button>
        </div>
      </div>

      {appliedYear === null && (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            조회 버튼을 클릭하면 통계를 불러옵니다.
          </CardContent>
        </Card>
      )}
      {appliedYear !== null && statistics.isFetching && (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            통계를 불러오는 중…
          </CardContent>
        </Card>
      )}
      {appliedYear !== null && statistics.isError && !statistics.isFetching && (
        <Card>
          <CardContent className="py-16 text-center text-sm text-red-500">
            해외마케팅 통계를 불러오지 못했습니다.
          </CardContent>
        </Card>
      )}

      {appliedYear !== null &&
        !statistics.isFetching &&
        !statistics.isError &&
        statistics.data && (
          <Card className="border-border/70 shadow-sm">
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle>{currentTab.title}</CardTitle>
                  <CardDescription>{currentTab.description}</CardDescription>
                </div>
                <div className="flex flex-wrap gap-1 rounded-md bg-gray-100 p-1">
                  {TABS.map((item) => (
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
            </CardHeader>

            {tab === 'flow' && (
              <CardContent className="h-[420px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} stroke="#e5e7eb" />
                    <XAxis
                      dataKey="bucket"
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatAxisNumber}
                    />
                    <Tooltip
                      formatter={(value) =>
                        `${Number(value).toLocaleString()}건`
                      }
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="inquiries"
                      name="문의 유입"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="exams"
                      name="검사"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="surgeries"
                      name="수술"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            )}

            {tab === 'revenue' && (
              <CardContent className="h-[420px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} stroke="#e5e7eb" />
                    <XAxis
                      dataKey="bucket"
                      tickLine={false}
                      axisLine={false}
                      minTickGap={24}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={formatWonAxis}
                      width={56}
                    />
                    <Tooltip formatter={(value) => formatWon(Number(value))} />
                    <Legend />
                    <Bar
                      dataKey="examRevenue"
                      name="검사"
                      stackId="revenue"
                      fill="#3b82f6"
                    />
                    <Bar
                      dataKey="surgeryRevenue"
                      name="수술"
                      stackId="revenue"
                      fill="#10b981"
                    />
                    <Bar
                      dataKey="outpatientRevenue"
                      name="외래"
                      stackId="revenue"
                      fill="#f59e0b"
                    />
                    <Bar
                      dataKey="lensRevenue"
                      name="렌즈"
                      stackId="revenue"
                      fill="#ef4444"
                      radius={[3, 3, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            )}

            {tab === 'countries' && (
              <CardContent className="h-[420px]">
                {countries.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={countries}
                      layout="vertical"
                      margin={{ top: 0, right: 24, left: 24, bottom: 0 }}
                    >
                      <CartesianGrid horizontal={false} stroke="#e5e7eb" />
                      <XAxis
                        type="number"
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="nationality"
                        tickLine={false}
                        axisLine={false}
                        width={72}
                      />
                      <Tooltip
                        formatter={(value) =>
                          `${Number(value).toLocaleString()}건`
                        }
                      />
                      <Bar
                        dataKey="surgeries"
                        name="수술"
                        fill="#8b5cf6"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    국가별 수술 데이터가 없습니다.
                  </div>
                )}
              </CardContent>
            )}

            {tab === 'table' && (
              <CardContent className="max-h-[560px] overflow-auto px-0">
                <table className="w-full min-w-[820px] border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-700">
                      {[
                        bucketUnit,
                        '문의',
                        '검사',
                        '수술',
                        '검사 매출',
                        '수술 매출',
                        '외래 매출',
                        '렌즈 매출',
                        '합계',
                      ].map((label) => (
                        <th
                          key={label}
                          className="sticky top-0 border-b border-r border-border/60 bg-gray-50 px-3 py-2 text-center font-semibold last:border-r-0"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((item) => (
                      <tr
                        key={item.bucket}
                        className="border-b border-border/40 hover:bg-blue-50/40"
                      >
                        <td className="border-r px-3 py-2 text-center font-semibold">
                          {item.bucket}
                        </td>
                        <td className="border-r px-3 py-2 text-right tabular-nums">
                          {item.inquiries.toLocaleString()}
                        </td>
                        <td className="border-r px-3 py-2 text-right tabular-nums">
                          {item.exams.toLocaleString()}
                        </td>
                        <td className="border-r px-3 py-2 text-right tabular-nums">
                          {item.surgeries.toLocaleString()}
                        </td>
                        <td className="border-r px-3 py-2 text-right tabular-nums">
                          {item.examRevenue.toLocaleString()}
                        </td>
                        <td className="border-r px-3 py-2 text-right tabular-nums">
                          {item.surgeryRevenue.toLocaleString()}
                        </td>
                        <td className="border-r px-3 py-2 text-right tabular-nums">
                          {item.outpatientRevenue.toLocaleString()}
                        </td>
                        <td className="border-r px-3 py-2 text-right tabular-nums">
                          {item.lensRevenue.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums">
                          {item.totalRevenue.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold">
                      <td className="border-r px-3 py-2 text-center">합계</td>
                      <td className="border-r px-3 py-2 text-right">
                        {totals.inquiries.toLocaleString()}
                      </td>
                      <td className="border-r px-3 py-2 text-right">
                        {totals.exams.toLocaleString()}
                      </td>
                      <td className="border-r px-3 py-2 text-right">
                        {totals.surgeries.toLocaleString()}
                      </td>
                      <td colSpan={5} className="px-3 py-2 text-right">
                        총 매출 {formatWon(totals.revenue)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </CardContent>
            )}
          </Card>
        )}
    </div>
  )
}
