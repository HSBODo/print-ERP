import { useYearCompare } from '#shared/ui/YearCompare/useYearCompare'

import {
  RESERVATION_OVERALL_TABS,
  type ReservationOverallTab,
} from '../utils/reservationOverallTabs'
import { useReservationOverallTrend } from './useReservationOverallTrend'

/** 예약 종합 연도 비교 데이터 — 탭에 따라 종합/온라인/콜 값을 고른다. */
export function useReservationOverall(
  years: number[],
  tab: ReservationOverallTab,
) {
  const { field } =
    RESERVATION_OVERALL_TABS.find((t) => t.key === tab) ??
    RESERVATION_OVERALL_TABS[0]
  const { dataMap, isLoading, isError } = useReservationOverallTrend(years)
  const yearCompare = useYearCompare(
    years,
    (year, monthIndex) => dataMap[year]?.[monthIndex]?.[field],
  )
  return { ...yearCompare, isLoading, isError }
}
