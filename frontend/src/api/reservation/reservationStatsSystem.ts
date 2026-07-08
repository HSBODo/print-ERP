import { z } from 'zod'
import { api } from '@/api/client'
import { apiResponseOf, withQuery } from '@/api/_shared'
import {
  reservationStatsDrillDownSchema,
  reservationStatsDiffSchema,
  reservationStatsParitySchema,
  type ReservationStatsDrillDown,
  type ReservationStatsDiff,
  type ReservationStatsParity,
} from './reservationStatsDiagnostics'
import {
  reservationStatsResponseMetaSchema,
  type ReservationStatsResponseMeta,
} from './reservationStatsMeta'

/**
 * 예약통계시스템 — BCRM RSS 컨택통계 일자별 원시 카운트(CH01~CH24).
 * 백엔드: GET /api/stats/reservation-stats-system?from&to → ApiResponse<DailyCounts[]>.
 * 비율·총예약 등 파생값은 프론트(reservationStatsSystemData)가 동일 공식으로 계산한다.
 * 실 데이터는 mssql 프로파일에서만 — 미연결 시 503 → 호출부가 미연결 안내 표시.
 */
/** 셀 손보정 이력 1건 — '이 셀은 수기 보정됨' 마커 + 추적(누가/언제). */
const cellEditSchema = z.object({
  field: z.string(),
  value: z.number(),
  editedBy: z.string(),
  editedAt: z.string(),
})
export type ReservationStatsCellEdit = z.infer<typeof cellEditSchema>

/** 손보정 가능한 필드(홈+네이버 온라인예약 원시 카운트 6개) — 백엔드 EDITABLE_FIELDS와 일치. */
export const RESERVATION_STATS_EDITABLE_FIELDS = [
  'homeReceived',
  'homeReservation',
  'naverReceived',
  'naverRejected',
  'naverValid',
  'naverReservation',
] as const
export type ReservationStatsEditableField = (typeof RESERVATION_STATS_EDITABLE_FIELDS)[number]

const dailyCountsSchema = z.object({
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
  manualEdits: z.array(cellEditSchema).optional(),
})

export type ReservationStatsDailyCounts = z.infer<typeof dailyCountsSchema>
export type ReservationStatsDailyCountsResult = {
  data: ReservationStatsDailyCounts[]
  meta?: ReservationStatsResponseMeta
}

const responseSchema = apiResponseOf(z.array(dailyCountsSchema), reservationStatsResponseMetaSchema)
const cellEditResponseSchema = apiResponseOf(dailyCountsSchema)

const diffResponseSchema = apiResponseOf(reservationStatsDiffSchema)
const drillDownResponseSchema = apiResponseOf(reservationStatsDrillDownSchema)
const parityResponseSchema = apiResponseOf(reservationStatsParitySchema)

export const reservationStatsSystemApi = {
  getDailyCounts: async (from: string, to: string): Promise<ReservationStatsDailyCountsResult> => {
    const res = await api.get<unknown>(withQuery('/stats/reservation-stats-system', { from, to }))
    const parsed = responseSchema.parse(res)
    return { data: parsed.data, meta: parsed.meta }
  },

  /**
   * 셀 손보정: 특정 일자의 홈페이지/네이버 온라인예약 원시 카운트(6개 필드) 값을 직접 수정한다.
   * postgres-mart 프로파일: reservation_stats_override 에 INSERT-only 로 이력 append.
   */
  editCell: async (
    period: string,
    date: string,
    field: ReservationStatsEditableField,
    value: number,
  ): Promise<ReservationStatsDailyCounts> => {
    const res = await api.post<unknown>(
      withQuery('/stats/reservation-stats-system/cell', { period, date, field, value }),
      {},
    )
    return cellEditResponseSchema.parse(res).data
  },

  /** 확정 스냅샷과 라이브 재조회값을 일자/필드별로 비교한다. */
  getDiff: async (period: string): Promise<ReservationStatsDiff> => {
    const res = await api.get<unknown>(
      withQuery('/stats/reservation-stats-system/diagnostics/diff', { period }),
    )
    return diffResponseSchema.parse(res).data
  },

  /** 특정 일자/필드의 원천 row 후보를 조회한다(diff 원인 추적용). */
  getDrillDown: async (period: string, date: string, field: string): Promise<ReservationStatsDrillDown> => {
    const res = await api.get<unknown>(
      withQuery('/stats/reservation-stats-system/diagnostics/drill-down', { period, date, field }),
    )
    return drillDownResponseSchema.parse(res).data
  },

  /** daily 집계값과 drill-down row 기여도 합계를 월/필드 단위로 대조한다. */
  getParity: async (period: string, field: string): Promise<ReservationStatsParity> => {
    const res = await api.get<unknown>(
      withQuery('/stats/reservation-stats-system/diagnostics/parity', { period, field }),
    )
    return parityResponseSchema.parse(res).data
  },
}
