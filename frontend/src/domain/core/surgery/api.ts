import { api } from '#shared/api/client'
import { withQuery } from '#shared/api/utils'

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
  getSurgeryMonthly: async (years: number[]) =>
    surgeryMonthlyResponseSchema.parse(await api.get<unknown>(withQuery('/stats/surgery/monthly', { years }))).data,

  getSurgeryRatio: async (years: number[]) =>
    surgeryMonthlyResponseSchema.parse(await api.get<unknown>(withQuery('/stats/surgery-ratio', { years }))).data,

  getSurgeryKpi: async (years: number[]) =>
    surgeryMonthlyResponseSchema.parse(await api.get<unknown>(withQuery('/stats/surgery/kpi', { years }))).data,

  getSurgeryTrend: async (years: number[]) =>
    surgeryMonthlyResponseSchema.parse(await api.get<unknown>(withQuery('/stats/surgery/panel/trend', { years }))).data,

  getSurgeryComposition: async (years: number[]) =>
    surgeryMonthlyResponseSchema.parse(await api.get<unknown>(withQuery('/stats/surgery/panel/composition', { years }))).data,

  /** 수술별 비중 일별 — mart_surgery_daily 조회. data+meta 반환(마트 미적재 시 라이브 폴백). */
  getSurgeryDaily: async (from: string, to: string) => {
    const res = surgeryDailyResponseSchema.parse(await api.get<unknown>(withQuery('/stats/surgery/daily', { from, to })))
    return { data: res.data, meta: res.meta }
  },
  getSurgeryList: async (from: string, to: string): Promise<SurgeryListItem[]> => {
    const res = await api.get<unknown>(withQuery('/surgery-list', { from, to }))
    return surgeryListResponseSchema.parse(res).data
  },
  getReoperationCandidates: async (from: string, to: string): Promise<ReoperationCandidate[]> => {
    const res = await api.get<unknown>(withQuery('/stats/surgery/reoperation-candidates', { from, to }))
    return reoperationCandidatesResponseSchema.parse(res).data
  },
  getReoperationDecisions: async (from: string, to: string): Promise<ReoperationDecisionRow[]> => {
    const res = await api.get<unknown>(withQuery('/reoperation-decisions', { from, to }))
    return reoperationDecisionListResponseSchema.parse(res).data
  },

  saveReoperationDecisions: async (decisions: ReoperationDecisionSaveItem[]): Promise<ReoperationDecisionRow[]> => {
    const res = await api.put<unknown>('/reoperation-decisions', { decisions })
    return reoperationDecisionSaveResponseSchema.parse(res).data
  },
}
