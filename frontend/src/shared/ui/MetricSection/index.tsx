import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '#shared/ui/Card'
import { changeRate } from '#shared/utils/stats'

/**
 * 지표 카드 한 장의 정의. `key` 는 source 항목에서 꺼낼 숫자 필드명.
 */
export interface MetricDef<T> {
  key: keyof T
  label: string
  format: (value: number) => string
}

/**
 * 기간 비교 지표 카드 묶음 (첫 기간이 기준, 나머지는 증감률 배지).
 *
 * B2B 매출·드림렌즈 매출 등 "기간별 비교" 형태의 통계 페이지 공용.
 */
export function MetricSection<T>({
  title,
  metrics,
  source,
  labels,
}: {
  title: string
  metrics: MetricDef<T>[]
  source: T[]
  labels: string[]
}) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">
        {title}
      </h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => {
          const values = source.map((item) => item[metric.key] as number)
          const base = values[0]
          return (
            <Card
              key={String(metric.key)}
              className="gap-2 border-border/70 shadow-sm"
            >
              <CardHeader className="gap-0.5 pb-0">
                <CardTitle className="text-base font-semibold tracking-normal text-gray-900">
                  {metric.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-0">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-3 border-b border-border/60 pb-2.5">
                  <p className="text-sm text-muted-foreground">
                    {labels[0]} (기준)
                  </p>
                  <p className="min-w-[9ch] text-right text-2xl font-semibold tracking-tight tabular-nums text-gray-900">
                    {metric.format(base)}
                  </p>
                </div>
                {values.slice(1).map((value, index) => {
                  const rate = changeRate(base, value)
                  const TrendIcon =
                    rate === 0 ? Minus : rate > 0 ? TrendingUp : TrendingDown
                  return (
                    <div
                      key={labels[index + 1]}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3"
                    >
                      <span className="text-sm text-muted-foreground">
                        {labels[index + 1]}
                      </span>
                      <div className="flex items-center justify-end gap-2">
                        <span
                          className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${rate === 0 ? 'bg-gray-100 text-gray-600' : rate > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}
                        >
                          <TrendIcon className="h-3 w-3" />
                          {rate > 0 ? '+' : ''}
                          {rate.toFixed(1)}%
                        </span>
                        <span className="min-w-[9ch] text-right text-sm font-medium tabular-nums text-gray-700">
                          {metric.format(value)}
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
  )
}
