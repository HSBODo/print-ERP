import { useQuery } from '@tanstack/react-query'
import { surgeryApi } from '@/api/surgery'

export function useSurgeryRatioTrend(years: number[]) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['surgery-ratio-trend', years],
    queryFn: () => surgeryApi.getSurgeryRatio(years),
    enabled: years.length > 0,
  })

  return {
    data,
    isLoading,
    isError,
  }
}
