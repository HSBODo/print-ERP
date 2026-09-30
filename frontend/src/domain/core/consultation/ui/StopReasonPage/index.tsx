import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from 'recharts'

import { CURRENT_YEAR } from '#shared/constants/chart'
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
import { Select } from '#shared/ui/Select'

import { useStopReasonMonthly } from '../../hooks/useStopReasonMonthly'
import type { StopReasonMonthlyItem } from '../../type/api'

const YEAR_OPTIONS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR]
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1)
// 공유 Select(예약통계 툴바 기준)용 옵션
const YEAR_SELECT_OPTIONS = YEAR_OPTIONS.map((y) => ({
  value: y,
  label: `${y}년`,
}))
const MONTH_SELECT_OPTIONS = MONTH_OPTIONS.map((m) => ({
  value: m,
  label: `${m}월`,
}))

// 잠정 중단 = 연파랑, 수술 불가 = 파랑, 합계 = 진파랑
const SUSPEND_COLOR = '#93C5FD'
const IMPOSSIBLE_COLOR = '#2563EB'
const TOTAL_COLOR = '#1E3A8A'

const REASONS: {
  key: keyof StopReasonMonthlyItem
  label: string
  group: '잠정 중단' | '수술 불가'
  color: string
}[] = [
  { key: 'other', label: '기타', group: '잠정 중단', color: SUSPEND_COLOR },
  {
    key: 'glaucoma',
    label: '불가-녹내장',
    group: '잠정 중단',
    color: SUSPEND_COLOR,
  },
  {
    key: 'visionChange',
    label: '불가-시력변화',
    group: '잠정 중단',
    color: SUSPEND_COLOR,
  },
  {
    key: 'recommendX',
    label: '불가-수술권유X',
    group: '수술 불가',
    color: IMPOSSIBLE_COLOR,
  },
  {
    key: 'lensImpossible',
    label: '불가-렌즈삽입불가',
    group: '수술 불가',
    color: IMPOSSIBLE_COLOR,
  },
  {
    key: 'keratoconus',
    label: '불가-원추각막',
    group: '수술 불가',
    color: IMPOSSIBLE_COLOR,
  },
  {
    key: 'avellino',
    label: '불가-아벨리노',
    group: '수술 불가',
    color: IMPOSSIBLE_COLOR,
  },
]

const chartConfig: ChartConfig = {
  value: { label: '건수', color: IMPOSSIBLE_COLOR },
}

export function StopReasonPage() {
  const [year, setYear] = useState(CURRENT_YEAR)
  const [month, setMonth] = useState(new Date().getMonth() + 1)

  const { dataMap, isLoading, isError } = useStopReasonMonthly([year])
  const item = dataMap[year]?.[month - 1] ?? null

  const chartData = useMemo(() => {
    const rows: { name: string; value: number; color: string }[] = REASONS.map(
      (r) => ({
        name: r.label,
        value: item ? item[r.key] : 0,
        color: r.color,
      }),
    )
    rows.push({
      name: '월 중단합계',
      value: item?.total ?? 0,
      color: TOTAL_COLOR,
    })
    return rows
  }, [item])

  const suspendTotal = REASONS.filter((r) => r.group === '잠정 중단').reduce(
    (sum, r) => sum + (item ? item[r.key] : 0),
    0,
  )
  const impossibleTotal = REASONS.filter((r) => r.group === '수술 불가').reduce(
    (sum, r) => sum + (item ? item[r.key] : 0),
    0,
  )

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[40rem] flex-col gap-4">
      {/* 예약통계(/reservation-stats) 툴바와 동일 규격: flat white · px-2 py-1.5 · text-xs · 공유 Select(h-8) */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-white px-2 py-1.5 text-xs shadow-sm">
        <Select
          value={year}
          onChange={setYear}
          options={YEAR_SELECT_OPTIONS}
          title="연도 선택"
        />
        <Select
          value={month}
          onChange={setMonth}
          options={MONTH_SELECT_OPTIONS}
          title="월 선택"
        />
        <div className="ml-auto flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: SUSPEND_COLOR }}
            />
            잠정 중단 <strong className="tabular-nums">{suspendTotal}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: IMPOSSIBLE_COLOR }}
            />
            수술 불가{' '}
            <strong className="tabular-nums">{impossibleTotal}</strong>
          </span>
        </div>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>중단 사유</CardTitle>
          <CardDescription>
            {year}년 {month}월 검사 중단(STOP_YN) 건을 사유별로 분류한
            그래프입니다. 합계는 전체지표 종합표의 중단수와 같습니다. 사유는
            검사메모의 공백·약어·표기 차이를 보정한 키워드 자동분류 기준입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col">
          {isError ? (
            <div className="flex flex-1 items-center justify-center text-sm text-red-500">
              데이터를 불러오지 못했습니다.
            </div>
          ) : isLoading ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              불러오는 중…
            </div>
          ) : (
            <ChartContainer
              config={chartConfig}
              className="aspect-auto min-h-0 w-full flex-1"
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
