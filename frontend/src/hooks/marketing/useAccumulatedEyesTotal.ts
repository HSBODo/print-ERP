import { useQuery } from '@tanstack/react-query'
import { accumulatedEyesApi } from '@/api/marketing/accumulatedEyes'

/**
 * 총 누적 안수 (마트 max). 홈 대시보드 KPI 카드용.
 * 원본 배치가 단조 증가로 관리하므로 max 값이 곧 전체 총계.
 */
export function useAccumulatedEyesTotal(enabled = true) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['accumulated-eyes-total'],
    queryFn: () => accumulatedEyesApi.getTotal(),
    enabled,
  })

  return {
    total: data ?? 0,
    isLoading,
    isError,
  }
}
