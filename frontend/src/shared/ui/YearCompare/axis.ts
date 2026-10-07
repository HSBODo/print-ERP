import { type Axis, niceAxis } from '#shared/utils/niceAxis'

import type { YearCompareFormat, YearCompareRow, YearSeries } from './type'

/**
 * Y축 범위·눈금 — 눈금이 0·500·1,000 / 0·20·40% 처럼 떨어진다.
 * 건수는 0부터(증감 과장 없이), 비율은 데이터 범위에 맞춘다.
 */
export function yAxisFor(
  format: YearCompareFormat,
  chartData: YearCompareRow[],
  series: YearSeries[],
): Axis {
  const values = chartData
    .flatMap((row) => series.map((s) => row[s.key]))
    .filter((value): value is number => typeof value === 'number')
  if (values.length === 0) return niceAxis([])
  return niceAxis(format === 'count' ? [0, ...values] : values)
}
