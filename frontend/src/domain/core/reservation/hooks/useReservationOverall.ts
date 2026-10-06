import { useMemo } from 'react'

import { MONTHS } from '#shared/constants/chart'
import type { ChartConfig } from '#shared/ui/Chart'

import {
  RESERVATION_OVERALL_TABS,
  type ReservationOverallTab,
} from '../utils/reservationOverallTabs'
import { useReservationOverallTrend } from './useReservationOverallTrend'

const RECENCY_COLORS = ['#E11D2E', '#4B5563', '#A8CEDF', '#F59E0B']

export interface ReservationOverallSeries {
  year: number
  /** chartData 의 열 이름 (y2026) */
  key: string
  color: string
  isLatest: boolean
}

export type ReservationOverallRow = Record<string, string | number | null>

/**
 * 예약 종합 화면 데이터 — 연도별 선(최신 연도일수록 진한 색) · 차트 설정 · 월별 행.
 * 탭에 따라 종합/온라인/콜 값을 고른다.
 */
export function useReservationOverall(
  years: number[],
  tab: ReservationOverallTab,
) {
  const field = (
    RESERVATION_OVERALL_TABS.find((t) => t.key === tab) ??
    RESERVATION_OVERALL_TABS[0]
  ).field

  const sortedYears = useMemo(() => [...years].sort((a, b) => a - b), [years])
  const { dataMap, isLoading, isError } =
    useReservationOverallTrend(sortedYears)

  const series = useMemo<ReservationOverallSeries[]>(() => {
    const latestYear = sortedYears[sortedYears.length - 1]
    return sortedYears.map((year, index) => ({
      year,
      key: `y${year}`,
      color:
        RECENCY_COLORS[
          Math.min(sortedYears.length - 1 - index, RECENCY_COLORS.length - 1)
        ],
      isLatest: year === latestYear,
    }))
  }, [sortedYears])

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

  const chartData = useMemo<ReservationOverallRow[]>(
    () =>
      MONTHS.map((month, monthIndex) => {
        const row: ReservationOverallRow = { month }
        sortedYears.forEach((year) => {
          row[`y${year}`] = dataMap[year]?.[monthIndex]?.[field] ?? null
        })
        return row
      }),
    [sortedYears, dataMap, field],
  )

  return { series, yearColors, chartConfig, chartData, isLoading, isError }
}
