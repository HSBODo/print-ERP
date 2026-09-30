import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { surgeryApi } from '../api'
import type {
  ReoperationDecisionRow,
  ReoperationDecisionSaveItem,
} from '../type/api'

/** 기간 내 저장된 재수술 판정 조회. enabled=false 이면 요청하지 않는다(모달 열릴 때만). */
export function useReoperationDecisions(
  from: string,
  to: string,
  enabled = true,
) {
  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['reoperation-decisions', from, to],
    queryFn: ({ signal }) =>
      surgeryApi.getReoperationDecisions(from, to, signal),
    enabled: enabled && Boolean(from && to),
  })

  return {
    decisions: (data ?? []) as ReoperationDecisionRow[],
    isLoading,
    isFetching,
    isError,
  }
}

/**
 * 재수술 판정 배치 저장(upsert). 성공하면 관련 캐시를 함께 무효화한다.
 *
 * 백엔드는 저장 성공 시 영향 받은 날짜 구간의 surgery 마트를 즉시 재빌드하지만,
 * 브라우저의 TanStack Query 캐시는 자동으로 알지 못한다 — 열려 있는 수술자 리스트·
 * 수술별 비중·주차 레포트 등이 옛 캐시를 계속 보여주면 사용자가 "저장이 반영이 안 됐다"
 * 고 오해한다. 재수술 값이 영향 주는 모든 도메인 캐시를 prefix 로 invalidate.
 */
export function useSaveReoperationDecisions(from: string, to: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (decisions: ReoperationDecisionSaveItem[]) =>
      surgeryApi.saveReoperationDecisions(decisions),
    onSuccess: () => {
      const affectedKeys = [
        ['reoperation-decisions', from, to],
        ['surgery-list'],
        ['surgery-daily'],
        ['surgery-composition'],
        ['surgery-kpi'],
        ['surgery-trend'],
        ['surgery-ratio-composition'],
        ['weekly-report'],
      ] as const
      affectedKeys.forEach((queryKey) => {
        queryClient.invalidateQueries({ queryKey: [...queryKey] })
      })
    },
  })
}
