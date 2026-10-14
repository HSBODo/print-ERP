import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { reservationApi } from '../api'
import type { ReservationOverallMonthlyItem } from '../type/api'

interface MonthlyData {
  reservations: number | null
  online: number | null
  call: number | null
}

const EMPTY: MonthlyData = {
  reservations: null,
  online: null,
  call: null,
}

function toDataMap(
  items: ReservationOverallMonthlyItem[],
): Record<number, MonthlyData[]> {
  const map: Record<number, MonthlyData[]> = {}
  for (const item of items) {
    if (!map[item.year])
      map[item.year] = Array.from({ length: 12 }, () => ({ ...EMPTY }))
    map[item.year][item.month - 1] = {
      reservations: item.reservations,
      online: item.online,
      call: item.call,
    }
  }
  return map
}

export function useReservationOverallTrend(years: number[]) {
  const {
    data: apiData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['reservation-overall-trend', years],
    queryFn: ({ signal }) =>
      reservationApi.getReservationOverallMonthly(years, signal),
    enabled: years.length > 0,
  })

  const dataMap = useMemo(() => (apiData ? toDataMap(apiData) : {}), [apiData])

  return {
    dataMap,
    isLoading,
    isError,
  }
}
