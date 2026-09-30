import { z } from 'zod'
import { apiResponseOf } from '#shared/api/utils'

/* ── 공통: 응답 meta · 진단(diff·drill-down·parity) ── */

export const reservationStatsResponseMetaSchema = z.object({
  source: z.enum(['SNAPSHOT', 'LIVE', 'MART', 'UNAVAILABLE']),
  period: z.string(),
  schemaVersion: z.number().optional(),
  formulaVersion: z.string().optional(),
  locked: z.boolean().optional(),
  confirmedAt: z.string().optional(),
  confirmedBy: z.string().optional(),
})

export type ReservationStatsResponseMeta = z.infer<
  typeof reservationStatsResponseMetaSchema
>

export const reservationStatsDiffItemSchema = z.object({
  date: z.string(),
  field: z.string(),
  label: z.string(),
  snapshotValue: z.number().nullable(),
  liveValue: z.number().nullable(),
  delta: z.number().nullable(),
})

export const reservationStatsDiffSchema = z.object({
  period: z.string(),
  snapshotExists: z.boolean(),
  liveFrom: z.string().nullable(),
  liveTo: z.string().nullable(),
  diffCount: z.number(),
  diffs: z.array(reservationStatsDiffItemSchema),
})

export const reservationStatsDrillDownRowSchema = z.object({
  date: z.string(),
  field: z.string(),
  source: z.string(),
  gb: z.string(),
  gb2: z.string(),
  primaryKey: z.string().nullable(),
  custNum: z.string().nullable().optional(),
  reserveNum: z.string().nullable().optional(),
  reserveState: z.string().nullable().optional(),
  exclusionReasonCandidate: z.string().nullable().optional(),
  contribution: z.number(),
})

export const reservationStatsDrillDownSchema = z.object({
  period: z.string(),
  date: z.string(),
  field: z.string(),
  label: z.string(),
  snapshotExists: z.boolean(),
  snapshotValue: z.number().nullable(),
  liveValue: z.number().nullable(),
  delta: z.number().nullable(),
  rowCount: z.number(),
  rows: z.array(reservationStatsDrillDownRowSchema),
})

export const reservationStatsParityItemSchema = z.object({
  date: z.string(),
  field: z.string(),
  label: z.string(),
  dailyValue: z.number(),
  drillDownValue: z.number(),
  delta: z.number(),
  rowCount: z.number(),
})

export const reservationStatsParitySchema = z.object({
  period: z.string(),
  field: z.string(),
  label: z.string(),
  liveFrom: z.string(),
  liveTo: z.string(),
  mismatchCount: z.number(),
  items: z.array(reservationStatsParityItemSchema),
})

export type ReservationStatsDiffItem = z.infer<
  typeof reservationStatsDiffItemSchema
>
export type ReservationStatsDiff = z.infer<typeof reservationStatsDiffSchema>
export type ReservationStatsDrillDownRow = z.infer<
  typeof reservationStatsDrillDownRowSchema
>
export type ReservationStatsDrillDown = z.infer<
  typeof reservationStatsDrillDownSchema
>
export type ReservationStatsParityItem = z.infer<
  typeof reservationStatsParityItemSchema
>
export type ReservationStatsParity = z.infer<
  typeof reservationStatsParitySchema
>

/**
 * 예약통계시스템 — BCRM RSS 컨택통계 일자별 원시 카운트(CH01~CH24).
 * 백엔드: GET /api/stats/reservation-stats-system?from&to → ApiResponse<DailyCounts[]>.
 * 비율·총예약 등 파생값은 프론트(reservationStatsSystemData)가 동일 공식으로 계산한다.
 * 마트 미연결 시 503 → 호출부가 미연결 안내 표시.
 */
/** 셀 손보정 이력 1건 — '이 셀은 수기 보정됨' 마커 + 추적(누가/언제). */
const systemCellEditSchema = z.object({
  field: z.string(),
  value: z.number(),
  editedBy: z.string(),
  editedAt: z.string(),
})
export type ReservationStatsCellEdit = z.infer<typeof systemCellEditSchema>

/** 손보정 가능한 필드(원시 카운트 24개 = 채널 21 + 종합 3) — 백엔드 EDITABLE_FIELDS와 일치. */
export const RESERVATION_STATS_EDITABLE_FIELDS = [
  'inboundCall',
  'answeredCall',
  'newInquiry',
  'callReservation',
  'tmTotalDb',
  'tmValidDb',
  'tmReservation',
  'tmRecounsel',
  'tmRecounselValid',
  'tmRecounselReservation',
  'homeReceived',
  'homeReservation',
  'naverReceived',
  'naverRejected',
  'naverValid',
  'naverReservation',
  'kakaoInquiry',
  'kakaoReservation',
  'cancelCallNaver',
  'cancelHome',
  'cancelKakao',
  'visit',
  'noShowReservation',
  'cancel',
] as const
export type ReservationStatsEditableField =
  (typeof RESERVATION_STATS_EDITABLE_FIELDS)[number]

const systemDailyCountsSchema = z.object({
  date: z.string(),
  inboundCall: z.number(),
  answeredCall: z.number(),
  newInquiry: z.number(),
  callReservation: z.number(),
  tmTotalDb: z.number(),
  tmValidDb: z.number(),
  tmReservation: z.number(),
  tmRecounsel: z.number(),
  tmRecounselValid: z.number(),
  tmRecounselReservation: z.number(),
  homeReceived: z.number(),
  homeReservation: z.number(),
  naverReceived: z.number(),
  naverRejected: z.number(),
  naverValid: z.number(),
  naverReservation: z.number(),
  kakaoInquiry: z.number(),
  kakaoReservation: z.number(),
  cancelCallNaver: z.number(),
  cancelHome: z.number(),
  cancelKakao: z.number(),
  visit: z.number(),
  noShowReservation: z.number(),
  cancel: z.number(),
  manualEdits: z.array(systemCellEditSchema).optional(),
})

export type ReservationStatsDailyCounts = z.infer<
  typeof systemDailyCountsSchema
>
export type ReservationStatsDailyCountsResult = {
  data: ReservationStatsDailyCounts[]
  meta?: ReservationStatsResponseMeta
}

export const systemResponseSchema = apiResponseOf(
  z.array(systemDailyCountsSchema),
  reservationStatsResponseMetaSchema,
)
export const systemCellEditResponseSchema = apiResponseOf(
  systemDailyCountsSchema,
)

export const systemDiffResponseSchema = apiResponseOf(
  reservationStatsDiffSchema,
)
export const systemDrillDownResponseSchema = apiResponseOf(
  reservationStatsDrillDownSchema,
)
export const systemParityResponseSchema = apiResponseOf(
  reservationStatsParitySchema,
)

/**
 * 예약통계_백내장 — 일자별 원시 카운트.
 * 백엔드: GET /api/stats/reservation-stats-cataract?from&to → ApiResponse<DailyCounts[]>.
 * 비율·합계·총예약건 등 파생값은 프론트(reservationStatsCataractData)가 동일 공식으로 계산한다.
 * 확정 스냅샷 우선, 없으면 배치 마트 조회. 미연결 시 503 → 호출부가 미연결 안내 표시.
 */
/** 셀 손보정 이력 1건 — '이 셀은 수기 보정됨' 마커 + 추적(누가/언제). */
const cataractCellEditSchema = z.object({
  field: z.string(),
  value: z.number(),
  editedBy: z.string(),
  editedAt: z.string(),
})
export type CataractStatsCellEdit = z.infer<typeof cataractCellEditSchema>

/** 손보정 가능한 필드(원시 카운트 21개 = 채널 18 + 종합 3) — 백엔드 EDITABLE_FIELDS와 일치. */
export const CATARACT_EDITABLE_FIELDS = [
  'totalCataract',
  'totalPresbyopia',
  'inboundCall',
  'answeredCall',
  'newExamInquiry',
  'newReInquiry',
  'newPatient',
  'tmTotalDb',
  'tmValidDb',
  'tmReservation',
  'kakaoTotalInquiry',
  'kakaoCataractReservation',
  'kakaoPresbyopiaReservation',
  'onlineReservation',
  'onlineNoShow',
  'cancelOnline',
  'cancelCrm',
  'cancelKakao',
  'visit',
  'noShowReservation',
  'cancel',
] as const
export type CataractEditableField = (typeof CATARACT_EDITABLE_FIELDS)[number]

const cataractDailyCountsSchema = z.object({
  date: z.string(),
  totalCataract: z.number(),
  totalPresbyopia: z.number(),
  inboundCall: z.number(),
  answeredCall: z.number(),
  newExamInquiry: z.number(),
  newReInquiry: z.number(),
  newPatient: z.number(),
  tmTotalDb: z.number(),
  tmValidDb: z.number(),
  tmReservation: z.number(),
  kakaoTotalInquiry: z.number(),
  kakaoCataractReservation: z.number(),
  kakaoPresbyopiaReservation: z.number(),
  onlineReservation: z.number(),
  onlineNoShow: z.number(),
  cancelOnline: z.number(),
  cancelCrm: z.number(),
  cancelKakao: z.number(),
  visit: z.number(),
  noShowReservation: z.number(),
  cancel: z.number(),
  manualEdits: z.array(cataractCellEditSchema).optional(),
})

export type CataractStatsDailyCounts = z.infer<typeof cataractDailyCountsSchema>
export type CataractStatsDailyCountsResult = {
  data: CataractStatsDailyCounts[]
  meta?: ReservationStatsResponseMeta
}

export const cataractResponseSchema = apiResponseOf(
  z.array(cataractDailyCountsSchema),
  reservationStatsResponseMetaSchema,
)
export const cataractCellEditResponseSchema = apiResponseOf(
  cataractDailyCountsSchema,
)

export const cataractDiffResponseSchema = apiResponseOf(
  reservationStatsDiffSchema,
)
export const cataractDrillDownResponseSchema = apiResponseOf(
  reservationStatsDrillDownSchema,
)
export const cataractParityResponseSchema = apiResponseOf(
  reservationStatsParitySchema,
)
