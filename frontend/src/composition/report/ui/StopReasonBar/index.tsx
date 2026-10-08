import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from 'recharts'

import type { StopReasonMonthlyItem } from '#domain/core/consultation/type/api'
import { Card, CardContent, CardHeader, CardTitle } from '#shared/ui/Card'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '#shared/ui/Chart'
import { Select } from '#shared/ui/Select'

const MONTH_SELECT_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}월`,
}))

/* ── 중단 사유 (막대, 최신월) ── */
const SUSPEND_COLOR = '#93C5FD'
const IMPOSSIBLE_COLOR = '#2563EB'
const TOTAL_COLOR = '#1E3A8A'

const REASONS: {
  key: keyof StopReasonMonthlyItem
  label: string
  color: string
}[] = [
  { key: 'other', label: '기타', color: SUSPEND_COLOR },
  { key: 'glaucoma', label: '불가-녹내장', color: SUSPEND_COLOR },
  { key: 'visionChange', label: '불가-시력변화', color: SUSPEND_COLOR },
  { key: 'recommendX', label: '불가-수술권유X', color: IMPOSSIBLE_COLOR },
  {
    key: 'lensImpossible',
    label: '불가-렌즈삽입불가',
    color: IMPOSSIBLE_COLOR,
  },
  { key: 'keratoconus', label: '불가-원추각막', color: IMPOSSIBLE_COLOR },
  { key: 'avellino', label: '불가-아벨리노', color: IMPOSSIBLE_COLOR },
]

const stopReasonConfig: ChartConfig = {
  value: { label: '건수', color: IMPOSSIBLE_COLOR },
}

export function StopReasonBar({
  year,
  items,
  month,
  onMonthChange,
}: {
  year: number
  items: (StopReasonMonthlyItem | null)[]
  month: number
  onMonthChange: (m: number) => void
}) {
  const item = items[month - 1] ?? null
  const monthLabel = `${year}년 ${month}월`

  const chartData = useMemo(() => {
    const rows = REASONS.map((r) => ({
      name: r.label,
      value: item ? item[r.key] : 0,
      color: r.color,
    }))
    rows.push({
      name: '월 중단합계',
      value: item?.total ?? 0,
      color: TOTAL_COLOR,
    })
    return rows
  }, [item])

  return (
    <Card className="report-chart flex break-inside-avoid flex-col border-border/70 shadow-sm">
      <CardHeader className="relative items-center pb-2">
        <CardTitle className="text-center text-lg">
          중단 사유
          <span className="text-sm font-medium text-muted-foreground">
            {' '}
            ({monthLabel})
          </span>
        </CardTitle>
        <div className="report-no-print absolute right-4 top-3">
          <Select
            value={month}
            onChange={onMonthChange}
            options={MONTH_SELECT_OPTIONS}
            title="월 선택"
          />
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={stopReasonConfig}
          className="report-chart-area aspect-auto h-[480px] w-full"
        >
          <BarChart
            data={chartData}
            margin={{ top: 28, left: 0, right: 16, bottom: 24 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              interval={0}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              height={60}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              width={40}
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              <LabelList
                dataKey="value"
                position="top"
                className="fill-foreground"
                fontSize={13}
                fontWeight={700}
              />
              {chartData.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
