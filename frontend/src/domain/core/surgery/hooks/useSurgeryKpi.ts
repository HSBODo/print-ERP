import { useQuery } from '@tanstack/react-query'

import { surgeryApi } from '../api'

export function useSurgeryKpi(years: number[]) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['surgery-kpi', years],
    queryFn: ({ signal }) => surgeryApi.getSurgeryKpi(years, signal),
    enabled: years.length > 0,
  })

  return {
    data,
    isLoading,
    isError,
  }
}
