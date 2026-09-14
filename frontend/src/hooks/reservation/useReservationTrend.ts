import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reservationApi, type ReservationMonthlyItem } from '@/api/reservation'

interface MonthlyData { surgery: number; outpatient: number; dreamlens: number }
const EMPTY: MonthlyData = { surgery: 0, outpatient: 0, dreamlens: 0 }

function toDataMap(items: ReservationMonthlyItem[]): Record<number, MonthlyData[]> {
  const map: Record<number, MonthlyData[]> = {}
  for (const item of items) {
    if (!map[item.year]) map[item.year] = Array.from({ length: 12 }, () => ({ ...EMPTY }))
    map[item.year][item.month - 1] = { surgery: item.surgery, outpatient: item.outpatient, dreamlens: item.dreamlens }
  }
  return map
}

export function useReservationTrend(queryYears: number[]) {
  const { data: apiData, isLoading, isError } = useQuery({
    queryKey: ['reservation-trend', queryYears],
    queryFn: () => reservationApi.getReservationTrend(queryYears),
  })

  const dataMap = useMemo(() => apiData ? toDataMap(apiData) : {}, [apiData])

  return { dataMap, isLoading, isError }
}
