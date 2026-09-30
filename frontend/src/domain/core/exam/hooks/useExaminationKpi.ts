import { useQuery } from '@tanstack/react-query'

import { examApi } from '../api'

export function useExaminationKpi(years: number[]) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['examination-kpi', years],
    queryFn: ({ signal }) => examApi.getExaminationKpi(years, signal),
    enabled: years.length > 0,
  })

  return {
    data,
    isLoading,
    isError,
  }
}
