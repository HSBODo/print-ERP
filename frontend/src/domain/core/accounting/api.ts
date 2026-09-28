import { withQuery } from '#shared/api/utils'
import { api } from '#shared/api/client'
import type { AccountingStatus, MedicalCategory, MedicalMonthlyMetric, MedicalReceipt, VisionMonthlyMetric, VisionReceipt } from './type/accounting'

import {
  medicalResponseSchema,
  visionResponseSchema,
  medicalMonthlyResponseSchema,
  visionMonthlyResponseSchema,
  statusResponseSchema,
} from './type/api'

/**
 * 회계 API — 마트(list_medical_receipt · list_vision_receipt · mart_medical_receipt_monthly) 조회. ADMIN 전용.
 * 진료 월별의 category 는 행 마트가 있는 연도(2026~)에만 걸리고, 그 전 연도는 '전체' 집계만 온다.
 */
export const accountingApi = {
  getMedicalReceipts: async (from: string, to: string): Promise<MedicalReceipt[]> => {
    const response = await api.get<unknown>(withQuery('/accounting/medical-receipts', { from, to }))
    return medicalResponseSchema.parse(response).data
  },
  getVisionReceipts: async (from: string, to: string): Promise<VisionReceipt[]> => {
    const response = await api.get<unknown>(withQuery('/accounting/vision-receipts', { from, to }))
    return visionResponseSchema.parse(response).data
  },
  getMedicalMonthly: async (years: number[], category: MedicalCategory = '전체'): Promise<MedicalMonthlyMetric[]> => {
    const response = await api.get<unknown>(
      withQuery('/accounting/medical-receipts/monthly', { years: years.join(','), category }),
    )
    return medicalMonthlyResponseSchema.parse(response).data
  },
  getVisionMonthly: async (years: number[]): Promise<VisionMonthlyMetric[]> => {
    const response = await api.get<unknown>(withQuery('/accounting/vision-receipts/monthly', { years: years.join(',') }))
    return visionMonthlyResponseSchema.parse(response).data
  },
  getStatus: async (): Promise<AccountingStatus> => {
    const response = await api.get<unknown>('/accounting/status')
    return statusResponseSchema.parse(response).data
  },
}
