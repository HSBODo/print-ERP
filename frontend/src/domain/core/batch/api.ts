import { api } from '#shared/api/client'

import {
  lastSuccessResponseSchema,
  type BatchLastSuccess,
  type BatchRunLog,
  runLogsResponseSchema,
  rerunResponseSchema,
  type BatchDomain,
} from './type/api'

export const batchApi = {
  lastSuccess: async (signal?: AbortSignal): Promise<BatchLastSuccess | null> => {
    const { data } = await api.get('/batch/last-success', { signal })
    return lastSuccessResponseSchema.parse(data).data
  },
  listRunLogs: async (limit = 50, signal?: AbortSignal): Promise<BatchRunLog[]> => {
    const { data } = await api.get('/admin/batch/run-logs', { params: { limit }, signal })
    return runLogsResponseSchema.parse(data)
  },

  rerun: async (from: string, to: string, domain: BatchDomain = 'ALL') => {
    const { data } = await api.post('/admin/batch/rerun', null, { params: { from, to, domain } })
    return rerunResponseSchema.parse(data)
  },

  /**
   * 원데이 검사 소급 보정만 수동 실행 (검사 도메인 특수 보정).
   * 정기: 매월 1일 03:30 KST 자동. 이 엔드포인트는 스케줄러 실패·backfill·개발 검증용.
   * min-year 가드 없음.
   */
  reconcileOnedayFlag: async (from: string, to: string) => {
    const { data } = await api.post('/admin/batch/exam/reconcile-oneday-flag', null, { params: { from, to } })
    return rerunResponseSchema.parse(data)
  },
}
