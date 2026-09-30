import { useMemo, useState } from 'react'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  CartesianGrid,
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
import { FilterBar } from '#shared/ui/FilterBar'
import { useFilterBar } from '#shared/ui/FilterBar/useFilterBar'
import {
  CHART_COLORS,
  MONTHS,
  YEAR_STROKE_PATTERNS,
} from '#shared/constants/chart'
import {
  changeRate,
  formatAxisMan,
  periodLabel,
  type Period,
} from '#shared/utils/stats'

/* ── 타입 ── */
type GroupKey = 'total' | 'refractive' | 'lens' | 'cataract'

interface MonthlyRevenue {
  refractiveRevenue: number
  refractiveCases: number
  lensRevenue: number
  lensCases: number
  cataractRevenue: number
  cataractCases: number
}

/* ── 상수 ── */
const GROUPS: { key: GroupKey; label: string }[] = [
  { key: 'total', label: '객단가' },
  { key: 'refractive', label: '시력교정' },
  { key: 'lens', label: '렌즈/각막' },
  { key: 'cataract', label: '백내장' },
]

const DETAIL_KEYS: Exclude<GroupKey, 'total'>[] = [
  'refractive',
  'lens',
  'cataract',
]

const GROUP_COLORS: Record<GroupKey, string> = {
  total: '#334155',
  refractive: 'var(--chart-1)',
  lens: 'var(--chart-3)',
  cataract: 'var(--chart-4)',
}

/* ── Mock 데이터 ── */
// [refRev(만원), refCases, lensRev, lensCases, catRev, catCases]
const toData = (a: number[]): MonthlyRevenue => ({
  refractiveRevenue: a[0],
  refractiveCases: a[1],
  lensRevenue: a[2],
  lensCases: a[3],
  cataractRevenue: a[4],
  cataractCases: a[5],
})

const mockData: Record<number, MonthlyRevenue[]> = {
  2024: [
    [4200, 28, 3800, 16, 2900, 19],
    [4400, 30, 3900, 17, 3000, 20],
    [4500, 32, 4100, 18, 3100, 21],
    [4700, 34, 4200, 19, 3200, 22],
    [4600, 33, 4000, 18, 3100, 21],
    [5000, 37, 4500, 21, 3400, 24],
    [5200, 39, 4700, 22, 3600, 25],
    [5100, 38, 4600, 21, 3500, 24],
    [5400, 41, 4900, 23, 3700, 26],
    [5600, 43, 5100, 24, 3800, 27],
    [5500, 42, 5000, 23, 3700, 26],
    [5800, 44, 5200, 25, 3900, 28],
  ].map(toData),
  2025: [
    [5000, 34, 4400, 19, 3300, 21],
    [5300, 37, 4600, 20, 3500, 23],
    [5500, 38, 4800, 22, 3600, 24],
    [5800, 41, 5000, 23, 3800, 26],
    [5600, 39, 4900, 22, 3700, 25],
    [6100, 44, 5400, 25, 4000, 28],
    [6400, 47, 5700, 27, 4200, 30],
    [6200, 45, 5500, 26, 4100, 29],
    [6600, 49, 5900, 28, 4400, 32],
    [6900, 52, 6100, 29, 4600, 33],
    [6700, 50, 6000, 28, 4500, 32],
    [7100, 54, 6400, 31, 4800, 35],
  ].map(toData),
  2026: [
    [5800, 40, 5100, 22, 3700, 24],
    [6200, 43, 5400, 24, 3900, 26],
    [6000, 41, 5200, 23, 3800, 25],
    [6500, 46, 5600, 26, 4100, 28],
    [6300, 44, 5500, 25, 4000, 27],
    [6800, 48, 5900, 28, 4300, 30],
    [7100, 51, 6200, 30, 4500, 32],
    [6900, 49, 6000, 29, 4400, 31],
    [7300, 53, 6500, 31, 4700, 34],
    [7600, 56, 6800, 33, 4900, 36],
    [7400, 54, 6600, 32, 4800, 35],
    [7800, 58, 7000, 34, 5100, 37],
  ].map(toData),
}

/* ── 유틸 ── */
const EMPTY: MonthlyRevenue = {
  refractiveRevenue: 0,
  refractiveCases: 0,
  lensRevenue: 0,
  lensCases: 0,
  cataractRevenue: 0,
  cataractCases: 0,
}

function totalRevenue(d: MonthlyRevenue, g: GroupKey): number {
  if (g === 'refractive') return d.refractiveRevenue
  if (g === 'lens') return d.lensRevenue
  if (g === 'cataract') return d.cataractRevenue
  return d.refractiveRevenue + d.lensRevenue + d.cataractRevenue
}

function unitPrice(d: MonthlyRevenue, g: GroupKey): number {
  if (g === 'refractive')
    return d.refractiveCases
      ? Math.round(d.refractiveRevenue / d.refractiveCases)
      : 0
  if (g === 'lens')
    return d.lensCases ? Math.round(d.lensRevenue / d.lensCases) : 0
  if (g === 'cataract')
    return d.cataractCases ? Math.round(d.cataractRevenue / d.cataractCases) : 0
  const totalRev = d.refractiveRevenue + d.lensRevenue + d.cataractRevenue
  const totalCases = d.refractiveCases + d.lensCases + d.cataractCases
  return totalCases ? Math.round(totalRev / totalCases) : 0
}

const pData = (p: Period) => mockData[p.year]?.[p.month] ?? EMPTY

const yearSumData = (year: number): MonthlyRevenue => {
  const ms = mockData[year] ?? []
  const r = { ...EMPTY }
  for (const m of ms) {
    r.refractiveRevenue += m.refractiveRevenue
    r.refractiveCases += m.refractiveCases
    r.lensRevenue += m.lensRevenue
    r.lensCases += m.lensCases
    r.cataractRevenue += m.cataractRevenue
    r.cataractCases += m.cataractCases
  }
  return r
}

const fmtPrice = (v: number | undefined) => `${(v ?? 0).toLocaleString()}만원`

/* ── 메인 ── */
export function UnitPricePage() {
  const filter = useFilterBar()
  const [selectedGroups, setSelectedGroups] = useState<GroupKey[]>(['total'])

  const periodsData = useMemo(() => filter.periods.map(pData), [filter.periods])
  const yearTotals = useMemo(
    () => filter.years.map(yearSumData),
    [filter.years],
  )
  const activeGroups = useMemo(
    () =>
      selectedGroups.includes('total')
        ? (['total'] as GroupKey[])
        : selectedGroups,
    [selectedGroups],
  )

  /* 월별 차트 */
  const monthChartConfig = useMemo(() => {
    const cfg: ChartConfig = {}
    filter.periods.forEach((p, i) => {
      cfg[`p${i}`] = { label: periodLabel(p), color: CHART_COLORS[i] }
    })
    return cfg
  }, [filter.periods])

  const monthChartData = useMemo(
    () =>
      GROUPS.map((g) => {
        const row: Record<string, string | number> = { name: g.label }
        periodsData.forEach((d, i) => {
          row[`p${i}`] = unitPrice(d, g.key)
        })
        return row
      }),
    [periodsData],
  )

  /* 연도별 차트 */
  const yearChartSeries = useMemo(() => {
    if (activeGroups.includes('total')) {
      return filter.years.map((year, yi) => ({
        key: `y${yi}_total`,
        label: `${year}년 · 전체`,
        color: GROUP_COLORS.total,
        strokeDasharray: YEAR_STROKE_PATTERNS[yi],
      }))
    }
    return filter.years.flatMap((year, yi) =>
      activeGroups.map((gk) => {
        const g = GROUPS.find((item) => item.key === gk)
        return {
          key: `y${yi}_${gk}`,
          label: `${year}년 · ${g?.label ?? gk}`,
          color: GROUP_COLORS[gk],
          strokeDasharray: YEAR_STROKE_PATTERNS[yi],
        }
      }),
    )
  }, [activeGroups, filter.years])

  const yearLineConfig = useMemo(() => {
    const cfg: ChartConfig = {}
    yearChartSeries.forEach((s) => {
      cfg[s.key] = { label: s.label, color: s.color }
    })
    return cfg
  }, [yearChartSeries])

  const yearChartData = useMemo(
    () =>
      MONTHS.map((month, mi) => {
        const row: Record<string, string | number> = { month }
        filter.years.forEach((y, i) => {
          const d = mockData[y]?.[mi] ?? EMPTY
          if (activeGroups.includes('total')) {
            row[`y${i}_total`] = unitPrice(d, 'total')
            return
          }
          activeGroups.forEach((gk) => {
            row[`y${i}_${gk}`] = unitPrice(d, gk)
          })
        })
        return row
      }),
    [activeGroups, filter.years],
  )

  const toggleGroup = (gk: GroupKey) => {
    if (gk === 'total') {
      setSelectedGroups(['total'])
      return
    }
    setSelectedGroups((cur) => {
      const without = cur.filter((k) => k !== 'total')
      const next = without.includes(gk)
        ? without.filter((k) => k !== gk)
        : [...without, gk]
      if (!next.length) return ['total']
      return DETAIL_KEYS.filter((k) => next.includes(k))
    })
  }

  return (
    <div className="space-y-6">
      {/* ── 필터 바 ── */}
      <FilterBar {...filter} />

      {/* ── 총매출 카드 ── */}
      <section>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          총매출
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {GROUPS.map((g) => {
            const values =
              filter.mode === 'month'
                ? periodsData.map((d) => totalRevenue(d, g.key))
                : yearTotals.map((d) => totalRevenue(d, g.key))
            const labels =
              filter.mode === 'month'
                ? filter.periods.map(periodLabel)
                : filter.years.map((y) => `${y}년`)
            const base = values[0]
            const revLabel = g.key === 'total' ? '전체' : g.label

            return (
              <Card key={g.key} className="gap-2 border-border/70 shadow-sm">
                <CardHeader className="gap-0.5 pb-0">
                  <CardTitle className="text-base font-semibold tracking-normal text-gray-900">
                    {revLabel}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 pt-0">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-3 border-b border-border/60 pb-2.5">
                    <p className="text-sm text-muted-foreground">
                      {labels[0]} (기준)
                    </p>
                    <p className="min-w-[7ch] text-right text-3xl font-semibold tracking-tight tabular-nums text-gray-900">
                      {fmtPrice(base)}
                    </p>
                  </div>
                  {values.slice(1).map((val, i) => {
                    const rate = changeRate(base, val)
                    const positive = rate > 0
                    const neutral = rate === 0
                    const TrendIcon = neutral
                      ? Minus
                      : positive
                        ? TrendingUp
                        : TrendingDown
                    return (
                      <div
                        key={labels[i + 1]}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3"
                      >
                        <span className="text-sm text-muted-foreground">
                          {labels[i + 1]}
                        </span>
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              neutral
                                ? 'bg-gray-100 text-gray-600'
                                : positive
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            <TrendIcon className="h-3 w-3" />
                            {rate > 0 ? '+' : ''}
                            {rate.toFixed(1)}%
                          </span>
                          <span className="min-w-[7ch] text-right text-sm font-medium tabular-nums text-gray-700">
                            {fmtPrice(val)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* ── 객단가 카드 ── */}
      <section>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          객단가
        </h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {GROUPS.map((g) => {
            const values =
              filter.mode === 'month'
                ? periodsData.map((d) => unitPrice(d, g.key))
                : yearTotals.map((d) => unitPrice(d, g.key))
            const labels =
              filter.mode === 'month'
                ? filter.periods.map(periodLabel)
                : filter.years.map((y) => `${y}년`)
            const base = values[0]
            const priceLabel = g.key === 'total' ? '전체' : g.label

            return (
              <Card key={g.key} className="gap-2 border-border/70 shadow-sm">
                <CardHeader className="gap-0.5 pb-0">
                  <CardTitle className="text-base font-semibold tracking-normal text-gray-900">
                    {priceLabel}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 pt-0">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-3 border-b border-border/60 pb-2.5">
                    <p className="text-sm text-muted-foreground">
                      {labels[0]} (기준)
                    </p>
                    <p className="min-w-[7ch] text-right text-3xl font-semibold tracking-tight tabular-nums text-gray-900">
                      {fmtPrice(base)}
                    </p>
                  </div>
                  {values.slice(1).map((val, i) => {
                    const rate = changeRate(base, val)
                    const positive = rate > 0
                    const neutral = rate === 0
                    const TrendIcon = neutral
                      ? Minus
                      : positive
                        ? TrendingUp
                        : TrendingDown
                    return (
                      <div
                        key={labels[i + 1]}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3"
                      >
                        <span className="text-sm text-muted-foreground">
                          {labels[i + 1]}
                        </span>
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              neutral
                                ? 'bg-gray-100 text-gray-600'
                                : positive
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            <TrendIcon className="h-3 w-3" />
                            {rate > 0 ? '+' : ''}
                            {rate.toFixed(1)}%
                          </span>
                          <span className="min-w-[7ch] text-right text-sm font-medium tabular-nums text-gray-700">
                            {fmtPrice(val)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* ── 차트 ── */}
      {filter.mode === 'month' ? (
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>수술 유형별 객단가 비교</CardTitle>
            <CardDescription>
              {filter.periods.map(periodLabel).join(' · ')}
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
                  tickFormatter={formatAxisMan}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) =>
                        `${Number(value).toLocaleString()}만원`
                      }
                    />
                  }
                />
                {filter.periods.map((_, i) => (
                  <Bar
                    key={`p${i}`}
                    dataKey={`p${i}`}
                    fill={`var(--color-p${i})`}
                    radius={[4, 4, 0, 0]}
                    barSize={Math.max(16, 56 / filter.periods.length)}
                  />
                ))}
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>월별 객단가 추이</CardTitle>
                <CardDescription>
                  전체는 합산 기준, 세부 그룹을 선택하면 분화되어 표시됩니다.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-1 rounded-md bg-gray-100 p-1">
                {GROUPS.map((g) => (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => toggleGroup(g.key)}
                    className={`h-8 rounded px-3 text-sm font-medium transition-colors ${
                      activeGroups.includes(g.key)
                        ? 'bg-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    style={
                      activeGroups.includes(g.key)
                        ? { color: GROUP_COLORS[g.key] }
                        : undefined
                    }
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={yearLineConfig} className="h-80 w-full">
              <LineChart data={yearChartData}>
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
                  tickFormatter={formatAxisMan}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) =>
                        `${Number(value).toLocaleString()}만원`
                      }
                    />
                  }
                />
                {yearChartSeries.map((s) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    stroke={`var(--color-${s.key})`}
                    strokeWidth={activeGroups.includes('total') ? 2.75 : 2.25}
                    strokeDasharray={s.strokeDasharray || undefined}
                    dot={yearChartSeries.length <= 4 ? { r: 4 } : false}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
