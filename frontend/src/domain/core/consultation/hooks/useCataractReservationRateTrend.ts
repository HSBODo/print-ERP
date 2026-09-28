import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { consultationApi } from '../api'
import type { CataractReservationRateItem } from '../type/api'

interface MonthlyData {
  examCount: number
  surgeryBookedCount: number
  reservationRate: number
}

const EMPTY: MonthlyData = {
  examCount: 0,
  surgeryBookedCount: 0,
  reservationRate: 0,
}

function toDataMap(items: CataractReservationRateItem[]): Record<number, MonthlyData[]> {
  const map: Record<number, MonthlyData[]> = {}
  for (const item of items) {
    if (!map[item.year]) map[item.year] = Array.from({ length: 12 }, () => ({ ...EMPTY }))
    map[item.year][item.month - 1] = {
      examCount: item.examCount,
      surgeryBookedCount: item.surgeryBookedCount,
      reservationRate: item.reservationRate,
    }
  }
  return map
}

export function useCataractReservationRateTrend(years: number[], category: 'vision' | 'cataract' = 'cataract') {
  const { data: apiData, isLoading, isError } = useQuery({
    queryKey: ['cataract-reservation-rate-trend', years, category],
    queryFn: () => consultationApi.getCataractReservationRateTrend(years, category),
    enabled: years.length > 0,
  })

  const dataMap = useMemo(() => (apiData ? toDataMap(apiData) : {}), [apiData])

  return {
    dataMap,
    isLoading,
    isError,
  }
}
