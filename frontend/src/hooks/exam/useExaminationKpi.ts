import { useQuery } from '@tanstack/react-query'
import { examApi } from '@/api/exam'

export function useExaminationKpi(years: number[]) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['examination-kpi', years],
    queryFn: () => examApi.getExaminationKpi(years),
    enabled: years.length > 0,
  })

  return {
    data,
    isLoading,
    isError,
  }
}
