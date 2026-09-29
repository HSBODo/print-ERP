import { useQuery } from '@tanstack/react-query'
import { consultationApi } from '../api'

export function useConsultationRateKpi(years: number[]) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['consultation-rate-kpi', years],
    queryFn: ({ signal }) => consultationApi.getConsultationRateKpi(years, signal),
    enabled: years.length > 0,
  })

  return {
    data,
    isLoading,
    isError,
  }
}
