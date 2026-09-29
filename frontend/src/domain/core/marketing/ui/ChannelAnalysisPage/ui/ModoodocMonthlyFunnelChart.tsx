import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { LoaderCircle, RefreshCw, TrendingUp } from 'lucide-react'
import { marketingApi } from '../../../api'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '#shared/ui/Chart'
import {
  buildYearMonthRanges,
  findModoodocFunnel,
  MODOODOC_FUNNEL_YEAR,
  toModoodocMonthlyRow,
} from '../utils/modoodocMonthlyFunnelModel'
import { Table } from './docParts'

const MONTH_RANGES = buildYearMonthRanges(MODOODOC_FUNNEL_YEAR)

const chartConfig = {
  reserved: { label: '예약', color: '#24438F' },
  notCancel: { label: '취소 제외', color: '#2E63DB' },
  visited: { label: '접수', color: '#19A7D8' },
  examined: { label: '검사', color: '#10B981' },
  notStop: { label: '중단 제외', color: '#14B8A6' },
  surgery: { label: '수술등록', color: '#F59E0B' },
  surgeryDone: { label: '수술완료', color: '#F97316' },
} satisfies ChartConfig

const BARS = [
  { key: 'reserved', color: 'var(--color-reserved)' },
  { key: 'notCancel', color: 'var(--color-notCancel)' },
  { key: 'visited', color: 'var(--color-visited)' },
  { key: 'examined', color: 'var(--color-examined)' },
  { key: 'notStop', color: 'var(--color-notStop)' },
  { key: 'surgery', color: 'var(--color-surgery)' },
  { key: 'surgeryDone', color: 'var(--color-surgeryDone)' },
] as const

async function getMonthlyFunnel(signal?: AbortSignal) {
  const monthlyResponses = await Promise.all(
    MONTH_RANGES.map(({ from, to }) => marketingApi.getReservationChannelFunnel(from, to, signal)),
  )

  return monthlyResponses.map((rows, index) =>
    toModoodocMonthlyRow(MONTH_RANGES[index].month, findModoodocFunnel(rows)),
  )
}

export function ModoodocMonthlyFunnelChart() {
  const { data = [], isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['reservation-channel', 'modoodoc-monthly', MODOODOC_FUNNEL_YEAR],
    queryFn: ({ signal }) => getMonthlyFunnel(signal),
    staleTime: 5 * 60 * 1000,
  })

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white px-5 py-5 shadow-sm sm:px-7 sm:py-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <TrendingUp className="h-4 w-4" />
            </span>
            <h2 className="text-[16px] font-bold tracking-tight text-slate-900">
              모두닥 월별 예약 → 수술 흐름
            </h2>
          </div>
          <p className="mt-1.5 text-[12.5px] text-slate-500">
            2026년 1~12월 · 등록일 기준 · 예약 건 단위
          </p>
        </div>
        {isFetching && !isLoading && (
          <span className="flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-600">
            <LoaderCircle className="h-3 w-3 animate-spin" />
            최신 데이터 반영 중
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-[390px] items-center justify-center gap-2 text-[13px] text-slate-400">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          월별 데이터를 불러오는 중입니다
        </div>
      ) : isError ? (
        <div className="flex h-[260px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-red-200 bg-red-50/40 text-center">
          <p className="text-[13px] font-semibold text-red-700">월별 데이터를 불러오지 못했습니다.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-red-700 shadow-sm hover:bg-red-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            다시 불러오기
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto pb-2">
            <ChartContainer
              config={chartConfig}
              className="h-[410px] min-w-[1040px] w-full aspect-auto"
              initialDimension={{ width: 1040, height: 410 }}
            >
              <BarChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 8 }} barCategoryGap="18%">
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={42}
                />
                <ChartTooltip
                  cursor={{ fill: '#F1F5F9', opacity: 0.7 }}
                  content={(
                    <ChartTooltipContent
                      labelFormatter={(label) => `${MODOODOC_FUNNEL_YEAR}년 ${String(label)}`}
                      valueFormatter={(value) => `${Number(value).toLocaleString()}건`}
                    />
                  )}
                />
                <ChartLegend content={<ChartLegendContent className="flex-wrap gap-x-4 gap-y-1" />} />
                {BARS.map(({ key, color }) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={color}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={12}
                  />
                ))}
              </BarChart>
            </ChartContainer>
          </div>
          <div className="mt-4">
            <p className="mb-2 text-[12px] font-semibold text-slate-500">단계별 월 건수</p>
            <Table
              head={['단계', ...data.map((row) => row.month), '합계']}
              rows={BARS.map(({ key }) => [
                <span key={key} className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="h-2 w-2 flex-none rounded-[3px]" style={{ background: chartConfig[key].color }} />
                  {chartConfig[key].label}
                </span>,
                ...data.map((row) => row[key].toLocaleString()),
                <b key="total" className="font-semibold">
                  {data.reduce((sum, row) => sum + row[key], 0).toLocaleString()}
                </b>,
              ])}
            />
          </div>
          <p className="mt-2 text-[11.5px] leading-relaxed text-slate-400">
            아직 데이터가 없거나 도래하지 않은 월은 0건으로 표시됩니다. 표의 합계는 1~12월 전체 합입니다.
          </p>
        </>
      )}
    </section>
  )
}
