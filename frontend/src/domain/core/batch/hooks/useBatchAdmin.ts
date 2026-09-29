import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { batchApi } from '../api'
import type { BatchDomain } from '../type/api'

const RUN_LOGS_KEY = ['admin', 'batch', 'run-logs'] as const

export const useBatchRunLogs = (limit = 50, autoRefresh = false) =>
  useQuery({
    queryKey: [...RUN_LOGS_KEY, limit],
    queryFn: ({ signal }) => batchApi.listRunLogs(limit, signal),
    refetchInterval: autoRefresh ? 3000 : false,
  })

export const useBatchRerun = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ from, to, domain }: { from: string; to: string; domain: BatchDomain }) =>
      batchApi.rerun(from, to, domain),
    onSettled: () => queryClient.invalidateQueries({ queryKey: RUN_LOGS_KEY }),
  })
}

/**
 * 원데이 검사 소급 보정 수동 실행. 성공/실패 시 실행 이력 자동 재조회.
 * 정기 매월 배치 실패·backfill·개발 검증용.
 */
export const useBatchReconcileOnedayFlag = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ from, to }: { from: string; to: string }) =>
      batchApi.reconcileOnedayFlag(from, to),
    onSettled: () => queryClient.invalidateQueries({ queryKey: RUN_LOGS_KEY }),
  })
}
