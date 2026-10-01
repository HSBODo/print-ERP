import { api } from '#shared/api/client'
import { apiResponseOf } from '#shared/api/utils'

import {
  type AllExamListItem,
  allExamListResponseSchema,
  type CataractExamListItem,
  cataractExamListResponseSchema,
  type EoeisCheckupResult,
  eoeisCheckupResultSchema,
  examCountByClassResponseSchema,
  type ExamCountByClassRow,
  examinationResponseSchema,
  type ExamListItem,
  examListResponseSchema,
  procedureExamResponseSchema,
} from './type/api'

export const examApi = {
  getExaminationMonthly: async (years: number[]) => {
    const { data } = await api.get<unknown>('/stats/examination/monthly', {
      params: { years },
    })
    return examinationResponseSchema.parse(data).data
  },

  getProcedureExamMonthly: async (years: number[], signal?: AbortSignal) => {
    const { data } = await api.get<unknown>('/stats/procedure-exam/monthly', {
      params: { years },
      signal,
    })
    return procedureExamResponseSchema.parse(data).data
  },

  getExaminationKpi: async (years: number[], signal?: AbortSignal) => {
    const { data } = await api.get<unknown>('/stats/examination/kpi', {
      params: { years },
      signal,
    })
    return examinationResponseSchema.parse(data).data
  },

  getExaminationTrend: async (years: number[], signal?: AbortSignal) => {
    const { data } = await api.get<unknown>('/stats/examination/trend', {
      params: { years },
      signal,
    })
    return examinationResponseSchema.parse(data).data
  },

  getExaminationComposition: async (years: number[], signal?: AbortSignal) => {
    const { data } = await api.get<unknown>('/stats/examination/composition', {
      params: { years },
      signal,
    })
    return examinationResponseSchema.parse(data).data
  },
  getAllExamList: async (
    from: string,
    to: string,
    signal?: AbortSignal,
  ): Promise<AllExamListItem[]> => {
    const { data } = await api.get<unknown>('/all-exam-list', {
      params: { from, to },
      signal,
    })
    return allExamListResponseSchema.parse(data).data
  },
  getCataractExamList: async (
    from: string,
    to: string,
    signal?: AbortSignal,
  ): Promise<CataractExamListItem[]> => {
    const { data } = await api.get<unknown>('/cataract-exam-list', {
      params: { from, to },
      signal,
    })
    return cataractExamListResponseSchema.parse(data).data
  },
  getEoeisCheckupStats: async (
    from: string,
    to: string,
    signal?: AbortSignal,
  ): Promise<EoeisCheckupResult> => {
    const { data } = await api.get<unknown>('/eoeis-checkup', {
      params: { from, to },
      signal,
    })
    return apiResponseOf(eoeisCheckupResultSchema).parse(data).data
  },
  getExamCountByClass: async (
    year: number,
    signal?: AbortSignal,
  ): Promise<ExamCountByClassRow[]> => {
    const { data } = await api.get<unknown>('/stats/exam-count/by-class', {
      params: { year },
      signal,
    })
    return examCountByClassResponseSchema.parse(data).data
  },
  getExamList: async (
    from: string,
    to: string,
    signal?: AbortSignal,
  ): Promise<ExamListItem[]> => {
    const { data } = await api.get<unknown>('/exam-list', {
      params: { from, to },
      signal,
    })
    return examListResponseSchema.parse(data).data
  },
}
