import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
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
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '#shared/ui/Chart'
import { FilterBar } from '#shared/ui/FilterBar'
import { useFilterBar } from '#shared/ui/FilterBar/useFilterBar'
import { KpiCard } from '#shared/ui/KpiCard'
import { PanelShell } from '#shared/ui/PanelShell'
import { StatsGrid } from '#shared/ui/StatsGrid'
import { StatsStack } from '#shared/ui/StatsStack'
import { useIsMobile } from '#shared/hooks/useIsMobile'
import { useSurgeryKpi } from '../../hooks/useSurgeryKpi'
import { useSurgeryTrend } from '../../hooks/useSurgeryTrend'
import { useSurgeryComposition } from '../../hooks/useSurgeryComposition'
import { CHART_COLORS, CURRENT_YEAR, MONTHS } from '#shared/constants/chart'
import { formatAxisNumber, periodLabel } from '#shared/utils/stats'

/* ── 타입 ── */
type GroupKey = 'total' | 'refractive' | 'lens' | 'cataract'

interface SurgeryData {
  lasek: number; lasik: number; smile: number; smilePro: number
  icl: number; tIcl: number; kpl: number; tKpl: number; viva: number
  catMulti: number; catMono: number; catEdof: number
  visionPatients: number; cataractPatients: number; total: number
}

/* ── 상수 ── */
const SURGERY_KEYS: (keyof SurgeryData)[] = [
  'lasek','lasik','smile','smilePro','icl','tIcl','kpl','tKpl','viva','catMulti','catMono','catEdof',
]

const GROUPS: { key: GroupKey; label: string; types: (keyof SurgeryData)[] }[] = [
  { key: 'total', label: '전체 수술건수', types: SURGERY_KEYS },
  { key: 'refractive', label: '시력교정', types: ['lasek','lasik','smile','smilePro'] },
  { key: 'lens', label: '렌즈/각막', types: ['icl','tIcl','kpl','tKpl','viva'] },
  { key: 'cataract', label: '백내장', types: ['catMulti','catMono','catEdof'] },
]

// 검사건수 그래프와 동일한 최신연도 기준 색상: 빨강 → 진회색 → 연하늘
const RECENCY_COLORS = ['#E11D2E', '#4B5563', '#A8CEDF']

const now = new Date()
const isFutureMonth = (year: number, monthIndex: number) =>
  year > now.getFullYear() ||
  (year === now.getFullYear() && monthIndex > now.getMonth())

/* ── 유틸 ── */
const EMPTY: SurgeryData = {
  lasek:0,lasik:0,smile:0,smilePro:0,icl:0,tIcl:0,kpl:0,tKpl:0,viva:0,catMulti:0,catMono:0,catEdof:0,
  visionPatients:0,cataractPatients:0,total:0,
}
const gSum = (d: SurgeryData, g: typeof GROUPS[number]) => {
  if (g.key === 'total') return d.total
  if (g.key === 'refractive') return d.visionPatients
  if (g.key === 'cataract') return d.cataractPatients
  return g.types.reduce((s, k) => s + d[k], 0)
}


function KpiCardsPanel({
  dataMap,
  mode,
  periods,
  years,
  isLoading,
  isError,
}: {
  dataMap: Record<number, SurgeryData[]>
  mode: string
  periods: Array<{ year: number; month: number }>
  years: number[]
  isLoading: boolean
  isError: boolean
}) {
  const periodsData = useMemo(
    () => periods.map((p) => dataMap[p.year]?.[p.month] ?? EMPTY),
    [periods, dataMap],
  )
  const yearTotals = useMemo(
    () =>
      years.map((year) => {
        const monthlyItems = dataMap[year] ?? []
        const result = { ...EMPTY }
        for (const item of monthlyItems) {
          for (const key of SURGERY_KEYS) {
            result[key] += item[key]
          }
          result.visionPatients += item.visionPatients
          result.cataractPatients += item.cataractPatients
          result.total += item.total
        }
        return result
      }),
    [years, dataMap],
  )

  const labels = mode === 'month' ? periods.map(periodLabel) : years.map((y) => `${y}년`)

  const renderCards = () => (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {GROUPS.map((g) => {
        const values = mode === 'month'
          ? periodsData.map((d) => gSum(d, g))
          : yearTotals.map((d) => gSum(d, g))
        return (
          <KpiCard key={g.key} label={g.label} values={values} labels={labels} />
        )
      })}
    </section>
  )

  return <PanelShell isLoading={isLoading} isError={isError} variant="kpi">{renderCards()}</PanelShell>
}

function MonthComparePanel({
  dataMap,
  periods,
  isLoading,
  isError,
}: {
  dataMap: Record<number, SurgeryData[]>
  periods: Array<{ year: number; month: number }>
  isLoading: boolean
  isError: boolean
}) {
  const periodsData = useMemo(
    () => periods.map((p) => dataMap[p.year]?.[p.month] ?? EMPTY),
    [periods, dataMap],
  )

  const monthChartConfig = useMemo(() => {
    const cfg: ChartConfig = {}
    periods.forEach((p, i) => { cfg[`p${i}`] = { label: periodLabel(p), color: CHART_COLORS[i] } })
    return cfg
  }, [periods])

  const monthChartData = useMemo(() =>
    GROUPS.map((g) => {
      const row: Record<string, string | number> = { name: g.label }
      periodsData.forEach((d, i) => { row[`p${i}`] = gSum(d, g) })
      return row
    }),
    [periodsData],
  )

  const renderChart = () => (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>수술 유형별 비교</CardTitle>
        <CardDescription>{periods.map(periodLabel).join(' · ')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={monthChartConfig} className="h-80 w-full">
          <BarChart data={monthChartData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatAxisNumber} />
            <ChartTooltip content={<ChartTooltipContent />} />
            {periods.map((_, i) => (
              <Bar
                key={`p${i}`}
                dataKey={`p${i}`}
                fill={`var(--color-p${i})`}
                radius={[4, 4, 0, 0]}
                barSize={Math.max(16, 56 / periods.length)}
              />
            ))}
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )

  return <PanelShell isLoading={isLoading} isError={isError} variant="bar">{renderChart()}</PanelShell>
}

function YearTrendPanel({
  dataMap,
  years,
  isLoading,
  isError,
}: {
  dataMap: Record<number, SurgeryData[]>
  years: number[]
  isLoading: boolean
  isError: boolean
}) {
  const [tab, setTab] = useState<GroupKey>('total')
  const sortedYears = useMemo(() => [...years].sort((a, b) => a - b).slice(-3), [years])
  const activeGroup = useMemo(() => GROUPS.find((item) => item.key === tab) ?? GROUPS[0], [tab])

  const yearChartSeries = useMemo(() => {
    const latestYear = sortedYears[sortedYears.length - 1]
    return sortedYears.map((year, index) => ({
      year,
      key: `y${year}`,
      label: `${year}`,
      color: RECENCY_COLORS[Math.min(sortedYears.length - 1 - index, RECENCY_COLORS.length - 1)],
      isLatest: year === latestYear,
    }))
  }, [sortedYears])

  const yearLineConfig = useMemo(() => {
    const cfg: ChartConfig = {}
    yearChartSeries.forEach((s) => { cfg[s.key] = { label: s.label, color: s.color } })
    return cfg
  }, [yearChartSeries])

  const yearChartData = useMemo(() =>
    MONTHS.map((month, mi) => {
      const row: Record<string, string | number | null> = { month }
      sortedYears.forEach((y) => {
        const d = dataMap[y]?.[mi] ?? EMPTY
        row[`y${y}`] = isFutureMonth(y, mi) ? null : gSum(d, activeGroup)
      })
      return row
    }),
    [activeGroup, sortedYears, dataMap],
  )

  const renderChart = () => (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>월별 추이 비교</CardTitle>
            <CardDescription>
              전체는 시력교정과 백내장을 합산한 흐름으로, 탭을 선택하면 해당 수술만 표시됩니다.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-1 rounded-md bg-gray-100 p-1">
            {GROUPS.map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => setTab(g.key)}
                className={`h-8 rounded px-3 text-sm font-medium transition-colors ${
                  tab === g.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6">
          {yearChartSeries.map((s) => (
            <span
              key={s.year}
              className="flex items-center gap-2 text-sm font-bold"
              style={{ color: s.isLatest ? s.color : '#374151' }}
            >
              <span className="h-[3px] w-8 rounded-full" style={{ backgroundColor: s.color }} />
              {s.year}
            </span>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ChartContainer config={yearLineConfig} className="h-96 w-full">
          <LineChart data={yearChartData} margin={{ top: 24, left: 0, right: 80 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" scale="band" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis
              width={80}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              domain={[0, 'auto']}
              tickFormatter={formatAxisNumber}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            {yearChartSeries.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={s.isLatest ? 3 : 2.5}
                dot={false}
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
          </LineChart>
        </ChartContainer>

        <div className="overflow-x-auto">
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
                <th className="py-2 font-semibold text-foreground">합계</th>
              </tr>
            </thead>
            <tbody>
              {yearChartSeries.map((s) => {
                const total = yearChartData.reduce((sum, row) => {
                  const value = row[s.key]
                  return typeof value === 'number' ? sum + value : sum
                }, 0)

                return (
                  <tr key={s.year} className="border-b border-border">
                    <td className="py-2">
                      <span
                        className="flex items-center justify-center gap-1.5 font-semibold"
                        style={{ color: s.isLatest ? s.color : undefined }}
                      >
                        <span
                          className="h-[3px] w-5 rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                        {s.year}
                      </span>
                    </td>
                    {MONTHS.map((_, monthIndex) => {
                      const value = yearChartData[monthIndex][s.key]
                      return (
                        <td key={monthIndex} className="py-2 tabular-nums">
                          {value === null ? '' : formatAxisNumber(value as number)}
                        </td>
                      )
                    })}
                    <td className="py-2 font-semibold tabular-nums">{formatAxisNumber(total)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )

  return <PanelShell isLoading={isLoading} isError={isError} variant="line">{renderChart()}</PanelShell>
}

export function SurgeryPage() {
  const filter = useFilterBar('year', [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR])
  const isMobile = useIsMobile()
  const { mode, periods, years } = filter
  const sortedYears = useMemo(() => [...years].sort((a, b) => a - b).slice(-3), [years])
  // 칩 색상을 YearTrendPanel 차트 라인 색상과 동일 공식으로 매핑 (최신 연도 index가 RECENCY_COLORS[0]).
  const yearChipColors = useMemo(() => {
    const map: Record<number, string> = {}
    sortedYears.forEach((year, index) => {
      map[year] = RECENCY_COLORS[Math.min(sortedYears.length - 1 - index, RECENCY_COLORS.length - 1)]
    })
    return map
  }, [sortedYears])

  const queryYears = useMemo(() => {
    const set = new Set<number>()
    if (mode === 'month') periods.forEach((p) => set.add(p.year))
    else sortedYears.forEach((y) => set.add(y))
    return [...set].sort()
  }, [mode, periods, sortedYears])

  const kpiQuery = useSurgeryKpi(queryYears)
  const trendQuery = useSurgeryTrend(queryYears)
  const compositionQuery = useSurgeryComposition(queryYears)

  const kpiDataMap = useMemo(
    () =>
      kpiQuery.data
        ? kpiQuery.data.reduce(
            (map, item) => {
              if (!map[item.year]) map[item.year] = Array.from({ length: 12 }, () => ({ ...EMPTY }))
              map[item.year][item.month - 1] = {
                lasek: item.lasek,
                lasik: item.lasik,
                smile: item.smile,
                smilePro: item.smilePro,
                icl: item.icl,
                tIcl: item.tIcl,
                kpl: item.kpl,
                tKpl: item.tKpl,
                viva: item.viva,
                catMulti: item.catMulti,
                catMono: item.catMono,
                catEdof: item.catEdof,
                visionPatients: item.visionPatients ?? 0,
                cataractPatients: item.cataractPatients ?? 0,
                total: item.total,
              }
              return map
            },
            {} as Record<number, SurgeryData[]>,
          )
        : {},
    [kpiQuery.data],
  )

  const trendDataMap = trendQuery.dataMap
  const compositionDataMap = compositionQuery.dataMap

  const Container = isMobile ? StatsStack : StatsGrid

  return (
    <div className="space-y-6">
      <FilterBar {...filter} yearOnly maxPeriods={3} yearChipColors={yearChipColors} />
      <Container>
        <KpiCardsPanel
          dataMap={kpiDataMap}
          mode={mode}
          periods={periods}
          years={years}
          isLoading={kpiQuery.isLoading}
          isError={kpiQuery.isError}
        />
        {mode === 'month' ? (
          <MonthComparePanel
            dataMap={compositionDataMap}
            periods={periods}
            isLoading={compositionQuery.isLoading}
            isError={compositionQuery.isError}
          />
        ) : (
          <YearTrendPanel
            dataMap={trendDataMap}
            years={years}
            isLoading={trendQuery.isLoading}
            isError={trendQuery.isError}
          />
        )}
      </Container>
    </div>
  )
}
