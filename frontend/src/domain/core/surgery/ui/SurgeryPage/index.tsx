import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { CHART_COLORS, CURRENT_YEAR } from '#shared/constants/chart'
import { useIsMobile } from '#shared/hooks/useIsMobile'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#shared/ui/Card'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '#shared/ui/Chart'
import { FilterBar } from '#shared/ui/FilterBar'
import { useFilterBar } from '#shared/ui/FilterBar/useFilterBar'
import { KpiCard } from '#shared/ui/KpiCard'
import { PanelShell } from '#shared/ui/PanelShell'
import { StatsGrid } from '#shared/ui/StatsGrid'
import { StatsStack } from '#shared/ui/StatsStack'
import { YearCompare } from '#shared/ui/YearCompare'
import { useYearCompare } from '#shared/ui/YearCompare/useYearCompare'
import { formatAxisNumber, periodLabel } from '#shared/utils/stats'

import { useSurgeryComposition } from '../../hooks/useSurgeryComposition'
import { useSurgeryKpi } from '../../hooks/useSurgeryKpi'
import { useSurgeryTrend } from '../../hooks/useSurgeryTrend'

/* ── 타입 ── */
type GroupKey = 'total' | 'refractive' | 'lens' | 'cataract'

interface SurgeryData {
  lasek: number
  lasik: number
  smile: number
  smilePro: number
  icl: number
  tIcl: number
  kpl: number
  tKpl: number
  viva: number
  catMulti: number
  catMono: number
  catEdof: number
  visionPatients: number
  cataractPatients: number
  total: number
}

/* ── 상수 ── */
const SURGERY_KEYS: (keyof SurgeryData)[] = [
  'lasek',
  'lasik',
  'smile',
  'smilePro',
  'icl',
  'tIcl',
  'kpl',
  'tKpl',
  'viva',
  'catMulti',
  'catMono',
  'catEdof',
]

const GROUPS: { key: GroupKey; label: string; types: (keyof SurgeryData)[] }[] =
  [
    { key: 'total', label: '전체 수술건수', types: SURGERY_KEYS },
    {
      key: 'refractive',
      label: '시력교정',
      types: ['lasek', 'lasik', 'smile', 'smilePro'],
    },
    {
      key: 'lens',
      label: '렌즈/각막',
      types: ['icl', 'tIcl', 'kpl', 'tKpl', 'viva'],
    },
    {
      key: 'cataract',
      label: '백내장',
      types: ['catMulti', 'catMono', 'catEdof'],
    },
  ]

/* ── 유틸 ── */
const EMPTY: SurgeryData = {
  lasek: 0,
  lasik: 0,
  smile: 0,
  smilePro: 0,
  icl: 0,
  tIcl: 0,
  kpl: 0,
  tKpl: 0,
  viva: 0,
  catMulti: 0,
  catMono: 0,
  catEdof: 0,
  visionPatients: 0,
  cataractPatients: 0,
  total: 0,
}
const gSum = (d: SurgeryData, g: (typeof GROUPS)[number]) => {
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
  periods: { year: number; month: number }[]
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

  const labels =
    mode === 'month' ? periods.map(periodLabel) : years.map((y) => `${y}년`)

  const renderCards = () => (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {GROUPS.map((g) => {
        const values =
          mode === 'month'
            ? periodsData.map((d) => gSum(d, g))
            : yearTotals.map((d) => gSum(d, g))
        return (
          <KpiCard
            key={g.key}
            label={g.label}
            values={values}
            labels={labels}
          />
        )
      })}
    </section>
  )

  return (
    <PanelShell isLoading={isLoading} isError={isError} variant="kpi">
      {renderCards()}
    </PanelShell>
  )
}

function MonthComparePanel({
  dataMap,
  periods,
  isLoading,
  isError,
}: {
  dataMap: Record<number, SurgeryData[]>
  periods: { year: number; month: number }[]
  isLoading: boolean
  isError: boolean
}) {
  const periodsData = useMemo(
    () => periods.map((p) => dataMap[p.year]?.[p.month] ?? EMPTY),
    [periods, dataMap],
  )

  const monthChartConfig = useMemo(() => {
    const cfg: ChartConfig = {}
    periods.forEach((p, i) => {
      cfg[`p${i}`] = { label: periodLabel(p), color: CHART_COLORS[i] }
    })
    return cfg
  }, [periods])

  const monthChartData = useMemo(
    () =>
      GROUPS.map((g) => {
        const row: Record<string, string | number> = { name: g.label }
        periodsData.forEach((d, i) => {
          row[`p${i}`] = gSum(d, g)
        })
        return row
      }),
    [periodsData],
  )

  const renderChart = () => (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <CardTitle>수술 유형별 비교</CardTitle>
        <CardDescription>
          {periods.map(periodLabel).join(' · ')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={monthChartConfig} className="h-80 w-full">
          <BarChart data={monthChartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
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

  return (
    <PanelShell isLoading={isLoading} isError={isError} variant="bar">
      {renderChart()}
    </PanelShell>
  )
}

function YearTrendPanel({
  tab,
  onTabChange,
  yearCompare,
  isLoading,
  isError,
}: {
  tab: GroupKey
  onTabChange: (tab: GroupKey) => void
  yearCompare: ReturnType<typeof useYearCompare>
  isLoading: boolean
  isError: boolean
}) {
  return (
    <YearCompare.Card
      isLoading={isLoading}
      isError={isError}
      title="월별 추이 비교"
      description="전체는 시력교정과 백내장을 합산한 흐름으로, 탭을 선택하면 해당 수술만 표시됩니다."
      tabs={
        <YearCompare.Tabs value={tab} onChange={onTabChange} tabs={GROUPS} />
      }
      series={yearCompare.series}
    >
      <YearCompare.Chart
        {...yearCompare}
        format="count"
        className="h-96 flex-none"
      />
      <YearCompare.Table {...yearCompare} format="count" />
    </YearCompare.Card>
  )
}

export function SurgeryPage() {
  const filter = useFilterBar('year', [
    CURRENT_YEAR - 2,
    CURRENT_YEAR - 1,
    CURRENT_YEAR,
  ])
  const isMobile = useIsMobile()
  const { mode, periods, years } = filter
  const sortedYears = useMemo(
    () => [...years].sort((a, b) => a - b).slice(-3),
    [years],
  )
  const queryYears = useMemo(() => {
    const source = mode === 'month' ? periods.map((p) => p.year) : sortedYears
    return [...new Set(source)].sort((a, b) => a - b)
  }, [mode, periods, sortedYears])

  const kpiQuery = useSurgeryKpi(queryYears)
  const trendQuery = useSurgeryTrend(queryYears)
  const compositionQuery = useSurgeryComposition(queryYears)

  const kpiDataMap = useMemo(
    () =>
      kpiQuery.data
        ? kpiQuery.data.reduce(
            (map, item) => {
              if (!map[item.year])
                map[item.year] = Array.from({ length: 12 }, () => ({
                  ...EMPTY,
                }))
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

  const [tab, setTab] = useState<GroupKey>('total')
  const activeGroup = GROUPS.find((item) => item.key === tab) ?? GROUPS[0]
  const yearCompare = useYearCompare(sortedYears, (year, monthIndex) =>
    gSum(trendQuery.dataMap[year]?.[monthIndex] ?? EMPTY, activeGroup),
  )
  const compositionDataMap = compositionQuery.dataMap

  const Container = isMobile ? StatsStack : StatsGrid

  return (
    <div className="space-y-6">
      <FilterBar
        {...filter}
        yearOnly
        maxPeriods={3}
        yearChipColors={yearCompare.yearColors}
      />
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
            tab={tab}
            onTabChange={setTab}
            yearCompare={yearCompare}
            isLoading={trendQuery.isLoading}
            isError={trendQuery.isError}
          />
        )}
      </Container>
    </div>
  )
}
