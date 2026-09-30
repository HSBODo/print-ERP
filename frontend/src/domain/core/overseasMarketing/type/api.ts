import { z } from 'zod'

import { apiResponseOf } from '#shared/api/utils'

export const overseasMarketingReceptionSchema = z.object({
  rowId: z.string(),
  seq: z.number().nullable(),
  source: z.enum(['manual', 'existing']),
  customerNo: z.string(),
  status: z.string(),
  inquiryDate: z.string(),
  name: z.string(),
  nationality: z.string(),
  gender: z.string(),
  birthDate: z.string(),
  contact: z.string(),
  email: z.string(),
  ethnicity: z.string(),
  occupation: z.string(),
  contactLens: z.string(),
  medicalConditions: z.string(),
  medicationAllergy: z.string(),
  departureSchedule: z.string(),
  examDate: z.string(),
  surgeryDate: z.string(),
  surgeryCost: z.string(),
  examCost: z.string(),
  operationRight: z.string(),
  operationLeft: z.string(),
  dreamlens: z.string(),
  channel: z.string(),
  channelId: z.string(),
  onlineChannel: z.string(),
  agentChannel: z.string(),
  agentId: z.string(),
  referral: z.string(),
  remark: z.string(),
  registeredDate: z.string(),
  matchedDate: z.string(),
  modifiedBy: z.string(),
  createdBy: z.string(),
  origin: z.enum(['sheet', 'manual']),
  locked: z.boolean(),
  candidateCustomerNo: z.string(),
  candidateReason: z.string(),
  matchedBy: z.string(),
  matchStatus: z.enum(['received', 'matched', 'review']),
  outpatient1Date: z.string(),
  outpatient1: z.string(),
  outpatient1Cost: z.string(),
  outpatient2Date: z.string(),
  outpatient2: z.string(),
  outpatient2Cost: z.string(),
  outpatient3Date: z.string(),
  outpatient3: z.string(),
  outpatient3Cost: z.string(),
  costSource: z.string(),
})

const bucketSchema = z.object({
  bucket: z.string(),
  inquiries: z.number(),
  exams: z.number(),
  surgeries: z.number(),
  examRevenue: z.number(),
  surgeryRevenue: z.number(),
  outpatientRevenue: z.number(),
  lensRevenue: z.number(),
})

const statisticsSchema = z.object({
  year: z.number(),
  granularity: z.enum(['month', 'week', 'day']),
  buckets: z.array(bucketSchema),
  topCountries: z.array(
    z.object({
      nationality: z.string(),
      surgeries: z.number(),
    }),
  ),
})

export type OverseasMarketingGranularity = 'month' | 'week' | 'day'
export type OverseasMarketingReception = z.infer<
  typeof overseasMarketingReceptionSchema
>
export type OverseasMarketingBucket = z.infer<typeof bucketSchema>
export type OverseasMarketingStatistics = z.infer<typeof statisticsSchema>

const syncResultSchema = z.object({
  inserted: z.number(),
  skipped: z.number(),
  outOfRange: z.number(),
  failed: z.number(),
  elapsedMillis: z.number(),
  message: z.string(),
})

export type OverseasMarketingSyncResult = z.infer<typeof syncResultSchema>

/** 수기 추가·수정 입력 — 시트 원본 컬럼만 다룬다(백엔드 upsert 요청 키와 동일). */
export interface OverseasMarketingReceptionInput {
  inquiryDate: string
  name: string
  contact: string
  email: string
  gender: string
  dob: string
  nationality: string
  ethnicity: string
  occupation: string
  contactLens: string
  medicalConditions: string
  medicationAllergy: string
  departureSchedule: string
  examDate: string
  surgeryDate: string
  surgeryCost: string
  channel: string
  onlineChannel: string
  remark: string
}

export type OverseasMarketingDateType =
  | 'reg_date'
  | 'matched_date'
  | 'inquiry_date'
  | 'departure_schedule'
  | 'exam_date'
  | 'surgery_date'

export interface OverseasMarketingReceptionParams {
  from: string
  to: string
  dateType: OverseasMarketingDateType
  dateEnabled: boolean
  status: string
  source: 'all' | 'manual' | 'existing'
  unmatched: boolean
}

export const receptionsResponseSchema = apiResponseOf(
  z.array(overseasMarketingReceptionSchema),
)
export const statisticsResponseSchema = apiResponseOf(statisticsSchema)
export const syncResponseSchema = apiResponseOf(syncResultSchema)
export const mutationResponseSchema = apiResponseOf(
  z.object({ rowNumber: z.number() }),
)
export const syncAvailabilityResponseSchema = apiResponseOf(
  z.object({ enabled: z.boolean() }),
)
// 동기화는 백그라운드 잡 — POST는 시작만 하고, 진행·결과는 status 폴링으로 받는다.
const crmSyncStatusSchema = z.object({
  state: z.enum(['idle', 'running', 'done', 'error']),
  phase: z.string().optional(),
  updatedAt: z.string().optional(),
  total: z.number().optional(),
  matched: z.number().optional(),
  review: z.number().optional(),
  merged: z.number().optional(),
  elapsedMillis: z.number().optional(),
  message: z.string().optional(),
})
export const crmSyncStatusResponseSchema = apiResponseOf(crmSyncStatusSchema)
export type OverseasCrmSyncStatus = z.infer<typeof crmSyncStatusSchema>

const crmCustomerSchema = z.object({
  customerNo: z.string(),
  name: z.string(),
  birthDate: z.string(),
  contact: z.string(),
  email: z.string(),
})
export const crmCustomerResponseSchema = apiResponseOf(crmCustomerSchema)
export const matchConfirmResponseSchema = apiResponseOf(
  z.object({
    rowNumber: z.number(),
    customerNo: z.string(),
    customerName: z.string(),
    matchedBy: z.string(),
  }),
)

export type OverseasMarketingCrmCustomer = z.infer<typeof crmCustomerSchema>

const reservationStatsSchema = z.object({
  year: z.number(),
  granularity: z.enum(['month', 'week', 'day']),
  cutover: z.string(),
  buckets: z.array(
    z.object({
      bucket: z.string(),
      values: z.record(z.string(), z.number()),
    }),
  ),
})
export const reservationStatsResponseSchema = apiResponseOf(
  reservationStatsSchema,
)
export const reservationStatUpdateResponseSchema = apiResponseOf(
  z.object({
    date: z.string(),
    groupKey: z.string(),
    metricKey: z.string(),
    value: z.number(),
  }),
)

export type OverseasReservationStats = z.infer<typeof reservationStatsSchema>
