import { useQuery } from '@tanstack/react-query'
import { reservationApi } from '@/api/reservation'

export function useReservationKpi(queryYears: number[]) {
  return useQuery({
    queryKey: ['reservation-kpi', queryYears],
    queryFn: () => reservationApi.getReservationKpi(queryYears),
  })
}
