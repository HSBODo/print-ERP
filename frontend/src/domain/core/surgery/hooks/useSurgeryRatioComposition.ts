import { useQuery } from '@tanstack/react-query'

import { surgeryApi } from '../api'

export function useSurgeryRatioComposition(years: number[]) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['surgery-ratio-composition', years],
    queryFn: ({ signal }) => surgeryApi.getSurgeryRatio(years, signal),
    enabled: years.length > 0,
  })

  return {
    data,
    isLoading,
    isError,
  }
}
