import { api } from '#shared/api/client'

import {
  type ReoperationCandidate,
  reoperationCandidatesResponseSchema,
  reoperationDecisionListResponseSchema,
  type ReoperationDecisionRow,
  type ReoperationDecisionSaveItem,
  reoperationDecisionSaveResponseSchema,
  surgeryDailyResponseSchema,
  type SurgeryListItem,
  surgeryListResponseSchema,
  surgeryMonthlyResponseSchema,
} from './type/api'

export const surgeryApi = {
  getSurgeryMonthly: async (years: number[]) => {
    const { data } = await api.get('/stats/surgery/monthly', {
      params: { years },
    })
    return surgeryMonthlyResponseSchema.parse(data).data
  },

  getSurgeryRatio: async (years: number[], signal?: AbortSignal) => {
    const { data } = await api.get('/stats/surgery-ratio', {
      params: { years },
      signal,
    })
    return surgeryMonthlyResponseSchema.parse(data).data
  },

  getSurgeryKpi: async (years: number[], signal?: AbortSignal) => {
    const { data } = await api.get('/stats/surgery/kpi', {
      params: { years },
      signal,
    })
    return surgeryMonthlyResponseSchema.parse(data).data
  },

  getSurgeryTrend: async (years: number[], signal?: AbortSignal) => {
    const { data } = await api.get('/stats/surgery/panel/trend', {
      params: { years },
      signal,
    })
    return surgeryMonthlyResponseSchema.parse(data).data
  },

  getSurgeryComposition: async (years: number[], signal?: AbortSignal) => {
    const { data } = await api.get('/stats/surgery/panel/composition', {
      params: { years },
      signal,
    })
    return surgeryMonthlyResponseSchema.parse(data).data
  },

  /** 수술별 비중 일별 — mart_surgery_daily 조회. data+meta 반환(마트 미적재 시 라이브 폴백). */
  getSurgeryDaily: async (from: string, to: string, signal?: AbortSignal) => {
    const { data } = await api.get('/stats/surgery/daily', {
      params: { from, to },
      signal,
    })
    const res = surgeryDailyResponseSchema.parse(data)
    return { data: res.data, meta: res.meta }
  },
  getSurgeryList: async (
    from: string,
    to: string,
    signal?: AbortSignal,
  ): Promise<SurgeryListItem[]> => {
    const { data } = await api.get('/surgery-list', {
      params: { from, to },
      signal,
    })
    return surgeryListResponseSchema.parse(data).data
  },
  getReoperationCandidates: async (
    from: string,
    to: string,
    signal?: AbortSignal,
  ): Promise<ReoperationCandidate[]> => {
    const { data } = await api.get('/stats/surgery/reoperation-candidates', {
      params: { from, to },
      signal,
    })
    return reoperationCandidatesResponseSchema.parse(data).data
  },
  getReoperationDecisions: async (
    from: string,
    to: string,
    signal?: AbortSignal,
  ): Promise<ReoperationDecisionRow[]> => {
    const { data } = await api.get('/reoperation-decisions', {
      params: { from, to },
      signal,
    })
    return reoperationDecisionListResponseSchema.parse(data).data
  },

  saveReoperationDecisions: async (
    decisions: ReoperationDecisionSaveItem[],
  ): Promise<ReoperationDecisionRow[]> => {
    const { data } = await api.put('/reoperation-decisions', { decisions })
    return reoperationDecisionSaveResponseSchema.parse(data).data
  },
}
