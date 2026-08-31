import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { smsApi, type SmsQueueStatus } from '@/api/sms'

/**
 * 자동 발송 큐 상태 요약 — 문자 발송 페이지 상단 KPI 카드에 씀.
 * 5분 폴러가 큐를 밀어내므로 30초 refetch 로 KPI 를 살짝만 늦게 반영해도 충분.
 */
export function useSmsQueueStatus() {
  return useQuery({
    queryKey: ['sms', 'queue', 'status'] as const,
    queryFn: () => smsApi.getQueueStatus(),
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}

/** 상태별 큐 행 목록 — 실패 재실행 모달에서 씀. */
export function useSmsQueueRows(status: SmsQueueStatus, limit = 100, enabled = true) {
  return useQuery({
    queryKey: ['sms', 'queue', 'rows', status, limit] as const,
    queryFn: () => smsApi.getQueueRows(status, limit),
    enabled,
    staleTime: 15_000,
  })
}

/** 실패 재실행 — 성공 시 큐 상태·행 캐시 invalidate. */
export function useRetryQueueRows() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => smsApi.retryQueueRows(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sms', 'queue'] })
    },
  })
}

/** 5분 폴러 즉시 실행 — 관리자 [지금 발송] 액션. */
export function useRunQueueNow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => smsApi.runQueueNow(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sms', 'queue'] })
      qc.invalidateQueries({ queryKey: ['sms', 'targets'] })
    },
  })
}
