import { useQuery } from '@tanstack/react-query'
import { outpatientApi } from '../api'
import type { OutpatientListItem } from '../type/api'

/**
 * 외래수 리스트 조회 훅. 예약일 범위(from~to)로 서버 조회.
 * 진료구분·상태·검색 필터는 페이지에서 클라이언트 사이드로 적용한다.
 */
export function useOutpatientList(from: string, to: string, enabled = true) {
  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['outpatient-list', from, to],
    queryFn: ({ signal }) => outpatientApi.getOutpatientList(from, to, signal),
    enabled: enabled && Boolean(from && to),
  })

  return {
    rows: enabled ? ((data ?? []) as OutpatientListItem[]) : [],
    isLoading,
    isFetching,
    isError,
  }
}
