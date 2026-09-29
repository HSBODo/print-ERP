import { api } from '#shared/api/client'
import { apiResponseOf } from '#shared/api/utils'

import {
  examinationResponseSchema,
  procedureExamResponseSchema,
  type AllExamListItem,
  allExamListResponseSchema,
  type CataractExamListItem,
  cataractExamListResponseSchema,
  eoeisCheckupResultSchema,
  type EoeisCheckupResult,
  type ExamCountByClassRow,
  examCountByClassResponseSchema,
  type ExamListItem,
  examListResponseSchema,
} from './type/api'

export const examApi = {
  getExaminationMonthly: async (years: number[]) => {
    const { data } = await api.get('/stats/examination/monthly', { params: { years } })
    return examinationResponseSchema.parse(data).data
  },

  getProcedureExamMonthly: async (years: number[]) => {
    const { data } = await api.get('/stats/procedure-exam/monthly', { params: { years } })
    return procedureExamResponseSchema.parse(data).data
  },

  getExaminationKpi: async (years: number[]) => {
    const { data } = await api.get('/stats/examination/kpi', { params: { years } })
    return examinationResponseSchema.parse(data).data
  },

  getExaminationTrend: async (years: number[]) => {
    const { data } = await api.get('/stats/examination/trend', { params: { years } })
    return examinationResponseSchema.parse(data).data
  },

  getExaminationComposition: async (years: number[]) => {
    const { data } = await api.get('/stats/examination/composition', { params: { years } })
    return examinationResponseSchema.parse(data).data
  },
  getAllExamList: async (from: string, to: string): Promise<AllExamListItem[]> => {
    const { data } = await api.get('/all-exam-list', { params: { from, to } })
    return allExamListResponseSchema.parse(data).data
  },
  getCataractExamList: async (from: string, to: string): Promise<CataractExamListItem[]> => {
    const { data } = await api.get('/cataract-exam-list', { params: { from, to } })
    return cataractExamListResponseSchema.parse(data).data
  },
  getEoeisCheckupStats: async (from: string, to: string): Promise<EoeisCheckupResult> => {
    const { data } = await api.get('/eoeis-checkup', { params: { from, to } })
    return apiResponseOf(eoeisCheckupResultSchema).parse(data).data
  },
  getExamCountByClass: async (year: number): Promise<ExamCountByClassRow[]> => {
    const { data } = await api.get('/stats/exam-count/by-class', { params: { year } })
    return examCountByClassResponseSchema.parse(data).data
  },
  getExamList: async (from: string, to: string): Promise<ExamListItem[]> => {
    const { data } = await api.get('/exam-list', { params: { from, to } })
    return examListResponseSchema.parse(data).data
  },
}
