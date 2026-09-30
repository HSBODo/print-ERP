import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reservationApi } from '../api'
import type { ReservationMonthlyItem } from '../type/api'

interface MonthlyData {
  surgery: number
  outpatient: number
  dreamlens: number
}

const EMPTY: MonthlyData = { surgery: 0, outpatient: 0, dreamlens: 0 }

function toDataMap(
  items: ReservationMonthlyItem[],
): Record<number, MonthlyData[]> {
  const map: Record<number, MonthlyData[]> = {}
  for (const item of items) {
    if (!map[item.year])
      map[item.year] = Array.from({ length: 12 }, () => ({ ...EMPTY }))
    map[item.year][item.month - 1] = {
      surgery: item.surgery,
      outpatient: item.outpatient,
      dreamlens: item.dreamlens,
    }
  }
  return map
}

export function useReservationMonthly(queryYears: number[]) {
  const {
    data: apiData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['reservation-monthly', queryYears],
    queryFn: ({ signal }) =>
      reservationApi.getReservationMonthly(queryYears, signal),
  })

  const dataMap = useMemo(() => (apiData ? toDataMap(apiData) : {}), [apiData])

  return { dataMap, isLoading, isError }
}
