import { useQuery } from '@tanstack/react-query'

import { examApi } from '../api'

export function useEoeisCheckup(from: string, to: string) {
  const query = useQuery({
    queryKey: ['eoeis-checkup', from, to],
    queryFn: ({ signal }) => examApi.getEoeisCheckupStats(from, to, signal),
    enabled: Boolean(from && to),
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
  }
}
