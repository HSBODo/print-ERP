import { Minus, TrendingDown, TrendingUp } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '#shared/ui/Card'
import { changeRate } from '#shared/utils/stats'

interface KpiCardProps {
  label: string
  values: number[]
  labels: string[]
  /** 값 포맷 함수 (기본: toLocaleString()) */
  formatValue?: (v: number) => string
  /** 증감 표시 단위 (기본: '%', 전환율 등은 '%p') */
  changeUnit?: string
  /** 증감 계산 방식: 'rate'=백분율 변화(changeRate), 'point'=포인트 차(next-base). 기본 'rate' */
  changeMode?: 'rate' | 'point'
}

const defaultFormat = (v: number) => v.toLocaleString()

export function KpiCard({
  label,
  values,
  labels,
  formatValue = defaultFormat,
  changeUnit = '%',
  changeMode = 'rate',
}: KpiCardProps) {
  const base = values[0]

  return (
    <Card className="gap-2 border-border/70 shadow-sm">
      <CardHeader className="gap-0.5 pb-0">
        <CardTitle className="text-base font-semibold tracking-normal text-gray-900">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5 pt-0">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-3 border-b border-border/60 pb-2.5">
          <p className="text-sm text-muted-foreground">{labels[0]} (기준)</p>
          <p className="min-w-[7ch] text-right text-3xl font-semibold tracking-tight tabular-nums text-gray-900">
            {formatValue(base)}
          </p>
        </div>
        {values.slice(1).map((val, i) => {
          const delta =
            changeMode === 'point' ? val - base : changeRate(base, val)
          const positive = delta > 0
          const neutral = delta === 0
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
                  {delta > 0 ? '+' : ''}
                  {delta.toFixed(1)}
                  {changeUnit}
                </span>
                <span className="min-w-[7ch] text-right text-sm font-medium tabular-nums text-gray-700">
                  {formatValue(val)}
                </span>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
