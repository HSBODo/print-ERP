import { useQuery } from '@tanstack/react-query'
import { surgeryApi } from '@/api/surgery'

export function useSurgeryRatioComposition(years: number[]) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['surgery-ratio-composition', years],
    queryFn: () => surgeryApi.getSurgeryRatio(years),
    enabled: years.length > 0,
  })

  return {
    data,
    isLoading,
    isError,
  }
}
