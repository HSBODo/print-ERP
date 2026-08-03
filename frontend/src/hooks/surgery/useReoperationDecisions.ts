import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  reoperationDecisionApi,
  type ReoperationDecisionRow,
  type ReoperationDecisionSaveItem,
} from '@/api/surgery/reoperationDecision'

/** 기간 내 저장된 재수술 판정 조회. enabled=false 이면 요청하지 않는다(모달 열릴 때만). */
export function useReoperationDecisions(from: string, to: string, enabled = true) {
  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['reoperation-decisions', from, to],
    queryFn: () => reoperationDecisionApi.list(from, to),
    enabled: enabled && Boolean(from && to),
  })

  return {
    decisions: (data ?? []) as ReoperationDecisionRow[],
    isLoading,
    isFetching,
    isError,
  }
}

/** 재수술 판정 배치 저장(upsert). 성공하면 조회 캐시를 무효화해서 최신 판정을 재로딩한다. */
export function useSaveReoperationDecisions(from: string, to: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (decisions: ReoperationDecisionSaveItem[]) =>
      reoperationDecisionApi.saveBatch(decisions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reoperation-decisions', from, to] })
    },
  })
}
