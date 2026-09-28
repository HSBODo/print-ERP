import { api } from '#shared/api/client'
import { withQuery } from '#shared/api/utils'

import {
  type ReservationStatsEditableField,
  type ReservationStatsDailyCounts,
  type ReservationStatsDailyCountsResult,
  systemResponseSchema,
  systemCellEditResponseSchema,
  systemDiffResponseSchema,
  systemDrillDownResponseSchema,
  systemParityResponseSchema,
  type CataractEditableField,
  type CataractStatsDailyCounts,
  type CataractStatsDailyCountsResult,
  cataractResponseSchema,
  cataractCellEditResponseSchema,
  cataractDiffResponseSchema,
  cataractDrillDownResponseSchema,
  cataractParityResponseSchema,
  type ReservationStatsDiff,
  type ReservationStatsDrillDown,
  type ReservationStatsParity,
} from './type/api'

export const reservationStatsApi = {
  getSystemDailyCounts: async (from: string, to: string): Promise<ReservationStatsDailyCountsResult> => {
    const res = await api.get<unknown>(withQuery('/stats/reservation-stats-system', { from, to }))
    const parsed = systemResponseSchema.parse(res)
    return { data: parsed.data, meta: parsed.meta }
  },

  /**
   * 셀 손보정: 특정 일자의 원시 카운트(24개 필드) 값을 직접 수정한다.
   * postgres-mart 프로파일: reservation_stats_override 에 INSERT-only 로 이력 append.
   */
  editSystemCell: async (
    period: string,
    date: string,
    field: ReservationStatsEditableField,
    value: number,
  ): Promise<ReservationStatsDailyCounts> => {
    const res = await api.post<unknown>(
      withQuery('/stats/reservation-stats-system/cell', { period, date, field, value }),
      {},
    )
    return systemCellEditResponseSchema.parse(res).data
  },

  /** 확정 스냅샷과 라이브 재조회값을 일자/필드별로 비교한다. */
  getSystemDiff: async (period: string): Promise<ReservationStatsDiff> => {
    const res = await api.get<unknown>(
      withQuery('/stats/reservation-stats-system/diagnostics/diff', { period }),
    )
    return systemDiffResponseSchema.parse(res).data
  },

  /** 특정 일자/필드의 원천 row 후보를 조회한다(diff 원인 추적용). */
  getSystemDrillDown: async (period: string, date: string, field: string): Promise<ReservationStatsDrillDown> => {
    const res = await api.get<unknown>(
      withQuery('/stats/reservation-stats-system/diagnostics/drill-down', { period, date, field }),
    )
    return systemDrillDownResponseSchema.parse(res).data
  },

  /** daily 집계값과 drill-down row 기여도 합계를 월/필드 단위로 대조한다. */
  getSystemParity: async (period: string, field: string): Promise<ReservationStatsParity> => {
    const res = await api.get<unknown>(
      withQuery('/stats/reservation-stats-system/diagnostics/parity', { period, field }),
    )
    return systemParityResponseSchema.parse(res).data
  },
  getCataractDailyCounts: async (from: string, to: string): Promise<CataractStatsDailyCountsResult> => {
    const res = await api.get<unknown>(withQuery('/stats/reservation-stats-cataract', { from, to }))
    const parsed = cataractResponseSchema.parse(res)
    return { data: parsed.data, meta: parsed.meta }
  },

  /**
   * 셀 손보정: 특정 일자의 원시 카운트(21개 필드) 값을 직접 수정한다.
   * postgres-mart 프로파일: reservation_stats_override 에 INSERT-only 로 이력 append.
   */
  editCataractCell: async (
    period: string,
    date: string,
    field: CataractEditableField,
    value: number,
  ): Promise<CataractStatsDailyCounts> => {
    const res = await api.post<unknown>(
      withQuery('/stats/reservation-stats-cataract/cell', { period, date, field, value }),
      {},
    )
    return cataractCellEditResponseSchema.parse(res).data
  },

  /** 확정 스냅샷과 라이브 재조회값을 일자/필드별로 비교한다. */
  getCataractDiff: async (period: string): Promise<ReservationStatsDiff> => {
    const res = await api.get<unknown>(
      withQuery('/stats/reservation-stats-cataract/diagnostics/diff', { period }),
    )
    return cataractDiffResponseSchema.parse(res).data
  },

  /** 특정 일자/필드의 원천 row 후보를 조회한다(diff 원인 추적용). */
  getCataractDrillDown: async (period: string, date: string, field: string): Promise<ReservationStatsDrillDown> => {
    const res = await api.get<unknown>(
      withQuery('/stats/reservation-stats-cataract/diagnostics/drill-down', { period, date, field }),
    )
    return cataractDrillDownResponseSchema.parse(res).data
  },

  /** daily 집계값과 drill-down row 기여도 합계를 월/필드 단위로 대조한다. */
  getCataractParity: async (period: string, field: string): Promise<ReservationStatsParity> => {
    const res = await api.get<unknown>(
      withQuery('/stats/reservation-stats-cataract/diagnostics/parity', { period, field }),
    )
    return cataractParityResponseSchema.parse(res).data
  },
}
