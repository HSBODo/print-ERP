import { api } from '#shared/api/client'
import { withQuery } from '#shared/api/utils'

import {
  lastSuccessResponseSchema,
  type BatchLastSuccess,
  type BatchRunLog,
  runLogsResponseSchema,
  rerunResponseSchema,
  type BatchDomain,
} from './type/api'

export const batchApi = {
  lastSuccess: async (): Promise<BatchLastSuccess | null> =>
    lastSuccessResponseSchema.parse(await api.get<unknown>('/batch/last-success')).data,
  listRunLogs: async (limit = 50): Promise<BatchRunLog[]> =>
    runLogsResponseSchema.parse(await api.get<unknown>(withQuery('/admin/batch/run-logs', { limit }))),

  rerun: async (from: string, to: string, domain: BatchDomain = 'ALL') =>
    rerunResponseSchema.parse(
      await api.post<unknown>(withQuery('/admin/batch/rerun', { from, to, domain }), null),
    ),

  /**
   * 원데이 검사 소급 보정만 수동 실행 (검사 도메인 특수 보정).
   * 정기: 매월 1일 03:30 KST 자동. 이 엔드포인트는 스케줄러 실패·backfill·개발 검증용.
   * min-year 가드 없음.
   */
  reconcileOnedayFlag: async (from: string, to: string) =>
    rerunResponseSchema.parse(
      await api.post<unknown>(
        withQuery('/admin/batch/exam/reconcile-oneday-flag', { from, to }),
        null,
      ),
    ),
}
