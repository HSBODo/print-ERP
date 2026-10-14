import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
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
  ChartTooltip,
  ChartTooltipContent,
} from '#shared/ui/Chart'
import { PanelShell } from '#shared/ui/PanelShell'
import { formatAxisNumber, formatAxisPercent } from '#shared/utils/stats'

import {
  barConfig,
  FAMILY_META,
  familyConfig,
  type FamilyKey,
  type MonthlyData,
  SURGERY_TYPES,
} from './surgeryRatioUtils'

interface CompositionPanelProps {
  selectedData: MonthlyData
  baseLabel: string
  isLoading: boolean
  isError: boolean
}

export function CompositionPanel({
  selectedData,
  baseLabel,
  isLoading,
  isError,
}: CompositionPanelProps) {
  const totalCases = useMemo(
    () => Object.values(selectedData).reduce((sum, value) => sum + value, 0),
    [selectedData],
  )

  const shareData = useMemo(
    () =>
      SURGERY_TYPES.map((type) => ({
        key: type.key,
        name: type.label,
        value: selectedData[type.key],
        share: totalCases
          ? Number(((selectedData[type.key] / totalCases) * 100).toFixed(1))
          : 0,
        fill: type.color,
      }))
        .filter((item) => item.value > 0)
        .sort((left, right) => right.value - left.value),
    [selectedData, totalCases],
  )

  const familyShareData = useMemo(
    () =>
      Object.entries(FAMILY_META).map(([familyKey, meta]) => {
        const value = SURGERY_TYPES.filter(
          (type) => type.family === (familyKey as FamilyKey),
        ).reduce((sum, type) => sum + selectedData[type.key], 0)
        return {
          key: familyKey,
          name: meta.label,
          value,
          fill: meta.color,
        }
      }),
    [selectedData],
  )

  const lensMixShare = totalCases
    ? Number(
        (
          ((selectedData.icl +
            selectedData.tIcl +
            selectedData.kpl +
            selectedData.tKpl +
            selectedData.viva) /
            totalCases) *
          100
        ).toFixed(1),
      )
    : 0

  const renderCharts = () => (
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>수술 유형별 점유율</CardTitle>
          <CardDescription>
            {baseLabel} 기준 수술 유형별 비중을 비교합니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* 막대 길이·축은 비중(%), 막대 끝 라벨과 툴팁에 건수를 함께 표기한다. */}
          <ChartContainer config={barConfig} className="h-[460px] w-full">
            <BarChart
              data={shareData}
              layout="vertical"
              margin={{ left: 8, right: 64 }}
            >
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickFormatter={formatAxisPercent} />
              <YAxis
                dataKey="name"
                type="category"
                width={120}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(_, name, item) =>
                      `${formatAxisNumber(item?.payload?.value ?? 0)}건 · ${Number(item?.payload?.share ?? 0).toFixed(1)}%`
                    }
                  />
                }
              />
              <Bar dataKey="share" radius={8} barSize={18}>
                <LabelList
                  dataKey="value"
                  position="right"
                  offset={8}
                  className="fill-foreground"
                  fontSize={12}
                  fontWeight={600}
                  formatter={(v) =>
                    typeof v === 'number' ? `${formatAxisNumber(v)}건` : ''
                  }
                />
                {shareData.map((entry) => (
                  <Cell key={entry.key} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>수술군 포트폴리오</CardTitle>
          <CardDescription>
            굴절교정, 렌즈삽입, 백내장 비중을 크게 봅니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ChartContainer
            config={familyConfig}
            className="mx-auto h-72 w-full max-w-[320px]"
          >
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel />}
              />
              <Pie
                data={familyShareData}
                dataKey="value"
                nameKey="key"
                innerRadius={66}
                outerRadius={96}
                paddingAngle={4}
                strokeWidth={3}
              >
                {familyShareData.map((entry) => (
                  <Cell key={entry.key} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="space-y-2 text-sm">
            {familyShareData.map((entry) => (
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
                  {totalCases
                    ? ((entry.value / totalCases) * 100).toFixed(1)
                    : '0.0'}
                  %
                </span>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-900">
              렌즈 기반 수술 비중
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
              {lensMixShare.toFixed(1)}%
            </p>
            <p className="mt-1 text-sm text-gray-600">
              ICL, T-ICL, KPL, T-KPL, VIVA 합산
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  )

  return (
    <PanelShell isLoading={isLoading} isError={isError} variant="bar">
      {renderCharts()}
    </PanelShell>
  )
}
