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
 * 예약통계_백내장 — 일자별 원시 카운트.
 * 백엔드: GET /api/stats/reservation-stats-cataract?from&to → ApiResponse<DailyCounts[]>.
 * 비율·합계·총예약건 등 파생값은 프론트(reservationStatsCataractData)가 동일 공식으로 계산한다.
 * 확정 스냅샷 우선, 없으면 mssql 라이브 조회. 미연결 시 503 → 호출부가 미연결 안내 표시.
 */
/** 셀 손보정 이력 1건 — '이 셀은 수기 보정됨' 마커 + 추적(누가/언제). */
const cellEditSchema = z.object({
  field: z.string(),
  value: z.number(),
  editedBy: z.string(),
  editedAt: z.string(),
})
export type CataractStatsCellEdit = z.infer<typeof cellEditSchema>

/** 손보정 가능한 필드(인입콜/응대콜만) — 백엔드 EDITABLE_FIELDS와 일치. */
export const CATARACT_EDITABLE_FIELDS = ['inboundCall', 'answeredCall'] as const
export type CataractEditableField = (typeof CATARACT_EDITABLE_FIELDS)[number]

const dailyCountsSchema = z.object({
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
  manualEdits: z.array(cellEditSchema).optional(),
})

export type CataractStatsDailyCounts = z.infer<typeof dailyCountsSchema>
export type CataractStatsDailyCountsResult = {
  data: CataractStatsDailyCounts[]
  meta?: ReservationStatsResponseMeta
}

const responseSchema = apiResponseOf(z.array(dailyCountsSchema), reservationStatsResponseMetaSchema)
const cellEditResponseSchema = apiResponseOf(dailyCountsSchema)

const diffResponseSchema = apiResponseOf(reservationStatsDiffSchema)
const drillDownResponseSchema = apiResponseOf(reservationStatsDrillDownSchema)
const parityResponseSchema = apiResponseOf(reservationStatsParitySchema)

export const reservationStatsCataractApi = {
  getDailyCounts: async (from: string, to: string): Promise<CataractStatsDailyCountsResult> => {
    const res = await api.get<unknown>(withQuery('/stats/reservation-stats-cataract', { from, to }))
    const parsed = responseSchema.parse(res)
    return { data: parsed.data, meta: parsed.meta }
  },

  /**
   * 셀 손보정: 특정 일자의 인입콜/응대콜을 직접 수정한다(휴가 등 라이브 어긋남 교정).
   * postgres-mart 프로파일: reservation_stats_override 에 INSERT-only 로 이력 append.
   */
  editCell: async (
    period: string,
    date: string,
    field: CataractEditableField,
    value: number,
  ): Promise<CataractStatsDailyCounts> => {
    const res = await api.post<unknown>(
      withQuery('/stats/reservation-stats-cataract/cell', { period, date, field, value }),
      {},
    )
    return cellEditResponseSchema.parse(res).data
  },

  /** 확정 스냅샷과 라이브 재조회값을 일자/필드별로 비교한다. */
  getDiff: async (period: string): Promise<ReservationStatsDiff> => {
    const res = await api.get<unknown>(
      withQuery('/stats/reservation-stats-cataract/diagnostics/diff', { period }),
    )
    return diffResponseSchema.parse(res).data
  },

  /** 특정 일자/필드의 원천 row 후보를 조회한다(diff 원인 추적용). */
  getDrillDown: async (period: string, date: string, field: string): Promise<ReservationStatsDrillDown> => {
    const res = await api.get<unknown>(
      withQuery('/stats/reservation-stats-cataract/diagnostics/drill-down', { period, date, field }),
    )
    return drillDownResponseSchema.parse(res).data
  },

  /** daily 집계값과 drill-down row 기여도 합계를 월/필드 단위로 대조한다. */
  getParity: async (period: string, field: string): Promise<ReservationStatsParity> => {
    const res = await api.get<unknown>(
      withQuery('/stats/reservation-stats-cataract/diagnostics/parity', { period, field }),
    )
    return parityResponseSchema.parse(res).data
  },
}
