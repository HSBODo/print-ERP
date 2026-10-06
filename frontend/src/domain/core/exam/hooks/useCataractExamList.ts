import { useQuery } from '@tanstack/react-query'

import { examApi } from '../api'

/**
 * 백내장 검사자 리스트 조회 훅. 검사일 범위(from~to)로 서버 조회.
 * 진료구분·검색 필터는 페이지에서 클라이언트 사이드로 적용한다.
 */
export function useCataractExamList(from: string, to: string, enabled = true) {
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['cataract-exam-list', from, to],
    queryFn: ({ signal }) => examApi.getCataractExamList(from, to, signal),
    enabled: enabled && Boolean(from && to),
  })

  return {
    rows: enabled ? (data ?? []) : [],
    isLoading,
    isFetching,
    isError,
    refetch,
  }
}
