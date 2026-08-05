import { useQuery } from '@tanstack/react-query'
import { eoeisCheckupApi } from '@/api/exam/eoeisCheckup'

export function useEoeisCheckup(from: string, to: string) {
  const query = useQuery({
    queryKey: ['eoeis-checkup', from, to],
    queryFn: () => eoeisCheckupApi.getStats(from, to),
    enabled: Boolean(from && to),
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
  }
}
