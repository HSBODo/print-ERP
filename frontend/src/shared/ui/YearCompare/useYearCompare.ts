import { useMemo } from 'react'

import { MONTHS } from '#shared/constants/chart'
import type { ChartConfig } from '#shared/ui/Chart'

import type { YearCompareRow, YearSeries } from './type'

/** 최신 연도부터 — 빨강 · 진회색 · 하늘 · 주황 */
const RECENCY_COLORS = ['#E11D2E', '#4B5563', '#A8CEDF', '#F59E0B']

const now = new Date()
const isFutureMonth = (year: number, monthIndex: number) =>
  year > now.getFullYear() ||
  (year === now.getFullYear() && monthIndex > now.getMonth())

/**
 * 연도 비교 차트·표 데이터 — 연도별 선(최신 연도일수록 진한 색) · 차트 설정 · 월별 행.
 * 미래 월은 getValue 를 부르지 않고 null 이라 선이 이번 달에서 끊긴다.
 */
export function useYearCompare(
  years: number[],
  getValue: (year: number, monthIndex: number) => number | null | undefined,
) {
  const sortedYears = useMemo(() => years.toSorted((a, b) => a - b), [years])

  const series = useMemo<YearSeries[]>(
    () =>
      sortedYears.map((year, index) => {
        const recency = sortedYears.length - 1 - index
        return {
          year,
          key: `y${year}`,
          color: RECENCY_COLORS[Math.min(recency, RECENCY_COLORS.length - 1)],
          isLatest: recency === 0,
        }
      }),
    [sortedYears],
  )

  const yearColors = useMemo(
    () => Object.fromEntries(series.map((s) => [s.year, s.color])),
    [series],
  )

  const chartConfig = useMemo<ChartConfig>(
    () =>
      Object.fromEntries(
        series.map((s) => [s.key, { label: `${s.year}`, color: s.color }]),
      ),
    [series],
  )

  // getValue 는 매 렌더 새 함수라 메모하지 않는다 — 12행 × 연도 수라 비용이 작다
  const chartData: YearCompareRow[] = MONTHS.map((month, monthIndex) => {
    const row: YearCompareRow = { month }
    for (const year of sortedYears) {
      row[`y${year}`] = isFutureMonth(year, monthIndex)
        ? null
        : (getValue(year, monthIndex) ?? null)
    }
    return row
  })

  return { series, yearColors, chartConfig, chartData }
}
