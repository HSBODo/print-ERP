import { z } from 'zod'

import { apiResponseOf } from '#shared/api/utils'

const lastSuccessSchema = z.object({
  targetDate: z.string(), // YYYY-MM-DD
  finishedAt: z.string(), // ISO datetime
})

export const lastSuccessResponseSchema = apiResponseOf(
  lastSuccessSchema.nullable(),
)

export type BatchLastSuccess = z.infer<typeof lastSuccessSchema>

const batchRunLogSchema = z.object({
  id: z.number(),
  jobName: z.string(),
  runType: z.enum(['DAILY', 'MONTHLY_RECONCILE', 'MANUAL', 'POLLER']),
  targetFrom: z.string().nullable(),
  targetTo: z.string().nullable(),
  status: z.enum(['RUNNING', 'SUCCESS', 'FAILED']),
  rowsUpserted: z.number(),
  // V17 이전 이력·실패·진행중 이력은 null. 성공 이력은 테이블명 → upsert 행 수.
  tableStats: z.record(z.string(), z.number()).nullable().optional(),
  startedAt: z.string(),
  finishedAt: z.string().nullable(),
  durationMs: z.number().nullable(),
  errorMessage: z.string().nullable(),
})
export type BatchRunLog = z.infer<typeof batchRunLogSchema>

export const runLogsResponseSchema = z.array(batchRunLogSchema)

export const rerunResponseSchema = z.object({
  ok: z.boolean(),
  from: z.string(),
  to: z.string(),
  domain: z.string().optional(),
  note: z.string().optional(),
})

export type BatchDomain =
  | 'ALL'
  | 'SURGERY'
  | 'ACCUMULATED_EYES'
  | 'RESERVATION'
  | 'RESERVATION_CHANGE'
  | 'EXAM'
  | 'CONSULTATION'
  | 'OUTPATIENT'
  | 'OVERALL'
  | 'ETC'
  | 'ACCOUNTING'
  | 'SMS'
