import { api } from '#shared/api/client'

import {
  surgeryMonthlyResponseSchema,
  surgeryDailyResponseSchema,
  type SurgeryListItem,
  surgeryListResponseSchema,
  type ReoperationCandidate,
  reoperationCandidatesResponseSchema,
  type ReoperationDecisionRow,
  reoperationDecisionListResponseSchema,
  reoperationDecisionSaveResponseSchema,
  type ReoperationDecisionSaveItem,
} from './type/api'

export const surgeryApi = {
  getSurgeryMonthly: async (years: number[]) => {
    const { data } = await api.get('/stats/surgery/monthly', { params: { years } })
    return surgeryMonthlyResponseSchema.parse(data).data
  },

  getSurgeryRatio: async (years: number[]) => {
    const { data } = await api.get('/stats/surgery-ratio', { params: { years } })
    return surgeryMonthlyResponseSchema.parse(data).data
  },

  getSurgeryKpi: async (years: number[]) => {
    const { data } = await api.get('/stats/surgery/kpi', { params: { years } })
    return surgeryMonthlyResponseSchema.parse(data).data
  },

  getSurgeryTrend: async (years: number[]) => {
    const { data } = await api.get('/stats/surgery/panel/trend', { params: { years } })
    return surgeryMonthlyResponseSchema.parse(data).data
  },

  getSurgeryComposition: async (years: number[]) => {
    const { data } = await api.get('/stats/surgery/panel/composition', { params: { years } })
    return surgeryMonthlyResponseSchema.parse(data).data
  },

  /** 수술별 비중 일별 — mart_surgery_daily 조회. data+meta 반환(마트 미적재 시 라이브 폴백). */
  getSurgeryDaily: async (from: string, to: string) => {
    const { data } = await api.get('/stats/surgery/daily', { params: { from, to } })
    const res = surgeryDailyResponseSchema.parse(data)
    return { data: res.data, meta: res.meta }
  },
  getSurgeryList: async (from: string, to: string): Promise<SurgeryListItem[]> => {
    const { data } = await api.get('/surgery-list', { params: { from, to } })
    return surgeryListResponseSchema.parse(data).data
  },
  getReoperationCandidates: async (from: string, to: string): Promise<ReoperationCandidate[]> => {
    const { data } = await api.get('/stats/surgery/reoperation-candidates', { params: { from, to } })
    return reoperationCandidatesResponseSchema.parse(data).data
  },
  getReoperationDecisions: async (from: string, to: string): Promise<ReoperationDecisionRow[]> => {
    const { data } = await api.get('/reoperation-decisions', { params: { from, to } })
    return reoperationDecisionListResponseSchema.parse(data).data
  },

  saveReoperationDecisions: async (decisions: ReoperationDecisionSaveItem[]): Promise<ReoperationDecisionRow[]> => {
    const { data } = await api.put('/reoperation-decisions', { decisions })
    return reoperationDecisionSaveResponseSchema.parse(data).data
  },
}
