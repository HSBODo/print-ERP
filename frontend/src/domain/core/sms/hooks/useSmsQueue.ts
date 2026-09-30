import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { smsApi } from '../api'
import type { SmsQueueStatus } from '../type/api'

/**
 * 자동 발송 큐 상태 요약 — 문자 발송 페이지 상단 KPI 카드에 씀.
 * 5분 폴러가 큐를 밀어내므로 30초 refetch 로 KPI 를 살짝만 늦게 반영해도 충분.
 *
 * range 를 넘기면 scheduled_at 기준 그 기간의 상태별 카운트를, 비우면 "최신 사이클"
 * 카운트를 돌려준다. queryKey 에 range 를 포함해 캐시가 겹치지 않게 한다.
 */
export function useSmsQueueStatus(range: { from?: string; to?: string } = {}) {
  return useQuery({
    queryKey: [
      'sms',
      'queue',
      'status',
      range.from ?? null,
      range.to ?? null,
    ] as const,
    queryFn: ({ signal }) => smsApi.getQueueStatus(range, signal),
    refetchInterval: 30_000,
    staleTime: 15_000,
  })
}

/**
 * 솔라피 계정 잔액 — 큐 카드에 함께 노출. 잔액은 자주 바뀌지 않아 큐보다 여유 있게 갱신.
 * 큐 카드가 접혀 있어도 상단 뱃지가 정보를 보여줘야 해서 enabled 는 항상 true.
 */
export function useSolapiBalance() {
  return useQuery({
    queryKey: ['sms', 'solapi', 'balance'] as const,
    queryFn: ({ signal }) => smsApi.getSolapiBalance(signal),
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

/** 상태별 큐 행 목록 — 실패 재실행 모달에서 씀. */
export function useSmsQueueRows(
  status: SmsQueueStatus,
  limit = 100,
  enabled = true,
) {
  return useQuery({
    queryKey: ['sms', 'queue', 'rows', status, limit] as const,
    queryFn: ({ signal }) => smsApi.getQueueRows(status, limit, {}, signal),
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
