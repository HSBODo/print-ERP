import { api } from '#shared/api/client'
import { apiResponseOf, withQuery } from '#shared/api/utils'

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
  getExaminationMonthly: async (years: number[]) =>
    examinationResponseSchema.parse(await api.get<unknown>(withQuery('/stats/examination/monthly', { years }))).data,

  getProcedureExamMonthly: async (years: number[]) =>
    procedureExamResponseSchema.parse(await api.get<unknown>(withQuery('/stats/procedure-exam/monthly', { years }))).data,

  getExaminationKpi: async (years: number[]) =>
    examinationResponseSchema.parse(await api.get<unknown>(withQuery('/stats/examination/kpi', { years }))).data,

  getExaminationTrend: async (years: number[]) =>
    examinationResponseSchema.parse(await api.get<unknown>(withQuery('/stats/examination/trend', { years }))).data,

  getExaminationComposition: async (years: number[]) =>
    examinationResponseSchema.parse(await api.get<unknown>(withQuery('/stats/examination/composition', { years }))).data,
  getAllExamList: async (from: string, to: string): Promise<AllExamListItem[]> => {
    const res = await api.get<unknown>(withQuery('/all-exam-list', { from, to }))
    return allExamListResponseSchema.parse(res).data
  },
  getCataractExamList: async (from: string, to: string): Promise<CataractExamListItem[]> => {
    const res = await api.get<unknown>(withQuery('/cataract-exam-list', { from, to }))
    return cataractExamListResponseSchema.parse(res).data
  },
  getEoeisCheckupStats: async (from: string, to: string): Promise<EoeisCheckupResult> => {
    const response = await api.get<unknown>(withQuery('/eoeis-checkup', { from, to }))
    return apiResponseOf(eoeisCheckupResultSchema).parse(response).data
  },
  getExamCountByClass: async (year: number): Promise<ExamCountByClassRow[]> => {
    const res = await api.get<unknown>(withQuery('/stats/exam-count/by-class', { year }))
    return examCountByClassResponseSchema.parse(res).data
  },
  getExamList: async (from: string, to: string): Promise<ExamListItem[]> => {
    const res = await api.get<unknown>(withQuery('/exam-list', { from, to }))
    return examListResponseSchema.parse(res).data
  },
}
