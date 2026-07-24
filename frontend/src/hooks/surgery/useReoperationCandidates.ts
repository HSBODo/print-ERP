import { useQuery } from '@tanstack/react-query'
import { reoperationCandidatesApi, type ReoperationCandidate } from '@/api/surgery/reoperationCandidates'

/**
 * 재수술 후보 조회 훅. 재수술일 범위(from~to)로 서버 조회.
 * enabled=false 이면 조회하지 않음(팝업 열릴 때만 조회).
 */
export function useReoperationCandidates(from: string, to: string, enabled = true) {
  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['reoperation-candidates', from, to],
    queryFn: () => reoperationCandidatesApi.getReoperationCandidates(from, to),
    enabled: enabled && Boolean(from && to),
  })

  return {
    candidates: (data ?? []) as ReoperationCandidate[],
    isLoading,
    isFetching,
    isError,
  }
}
