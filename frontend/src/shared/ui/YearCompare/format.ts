import { formatAxisNumber, formatAxisPercent } from '#shared/utils/stats'

import type { YearCompareFormat } from './type'

/** 레이블·표·툴팁 값 — 비율은 소수 1자리 */
export const formatValue = (format: YearCompareFormat, value: number) =>
  format === 'percent' ? `${value.toFixed(1)}%` : formatAxisNumber(value)

/** Y축 눈금 */
export const formatTick = (format: YearCompareFormat, value: number) =>
  format === 'percent' ? formatAxisPercent(value) : formatAxisNumber(value)

/** 표 마지막 열 — 건수는 합계, 비율은 월 평균. 값이 하나도 없으면 null */
export function summarize(format: YearCompareFormat, values: number[]) {
  if (values.length === 0) return null
  const sum = values.reduce((acc, value) => acc + value, 0)
  return format === 'percent' ? sum / values.length : sum
}

export const SUMMARY_LABEL: Record<YearCompareFormat, string> = {
  count: '합계',
  percent: '평균',
}
