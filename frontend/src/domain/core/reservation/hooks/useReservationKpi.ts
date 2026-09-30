import { useQuery } from '@tanstack/react-query'

import { reservationApi } from '../api'

export function useReservationKpi(queryYears: number[]) {
  return useQuery({
    queryKey: ['reservation-kpi', queryYears],
    queryFn: ({ signal }) =>
      reservationApi.getReservationKpi(queryYears, signal),
  })
}
