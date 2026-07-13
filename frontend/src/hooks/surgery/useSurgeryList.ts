import { useQuery } from '@tanstack/react-query'
import { surgeryListApi, type SurgeryListItem } from '@/api/surgery/surgeryList'

/**
 * 수술자 리스트 조회 훅. 수술일 범위(from~to)로 서버 조회.
 */
export function useSurgeryList(from: string, to: string, enabled = true) {
  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['surgery-list', from, to],
    queryFn: () => surgeryListApi.getSurgeryList(from, to),
    enabled: enabled && Boolean(from && to),
  })

  return {
    rows: enabled ? (data ?? []) as SurgeryListItem[] : [],
    isLoading,
    isFetching,
    isError,
  }
}
