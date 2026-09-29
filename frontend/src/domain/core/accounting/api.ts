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
    const { data } = await api.get('/accounting/medical-receipts', { params: { from, to } })
    return medicalResponseSchema.parse(data).data
  },
  getVisionReceipts: async (from: string, to: string): Promise<VisionReceipt[]> => {
    const { data } = await api.get('/accounting/vision-receipts', { params: { from, to } })
    return visionResponseSchema.parse(data).data
  },
  getMedicalMonthly: async (years: number[], category: MedicalCategory = '전체'): Promise<MedicalMonthlyMetric[]> => {
    const { data } = await api.get('/accounting/medical-receipts/monthly', { params: { years, category } })
    return medicalMonthlyResponseSchema.parse(data).data
  },
  getVisionMonthly: async (years: number[]): Promise<VisionMonthlyMetric[]> => {
    const { data } = await api.get('/accounting/vision-receipts/monthly', { params: { years } })
    return visionMonthlyResponseSchema.parse(data).data
  },
  getStatus: async (): Promise<AccountingStatus> => {
    const { data } = await api.get('/accounting/status')
    return statusResponseSchema.parse(data).data
  },
}
