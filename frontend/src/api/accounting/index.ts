import { z } from 'zod'
import { apiResponseOf, withQuery } from '#shared/api/utils'
import { api } from '#shared/api/client'
import type {
  AccountingStatus,
  MedicalCategory,
  MedicalMonthlyMetric,
  MedicalReceipt,
  VisionMonthlyMetric,
  VisionReceipt,
} from './types'

export type {
  AccountingStatus,
  MedicalCategory,
  MedicalMonthlyMetric,
  MedicalReceipt,
  VisionItemKey,
  VisionMonthlyMetric,
  VisionReceipt,
} from './types'
export { VISION_ITEM_KEYS } from './types'

const medicalReceiptSchema = z.object({
  id: z.string(), receiptDate: z.string(), chartNo: z.string(), patientName: z.string(), doctor: z.string(),
  receiptStaff: z.string(), receiptType: z.string(), revenueType: z.string(), room: z.string(),
  status: z.enum(['정상', '취소']), receiptTime: z.string(), serialNo: z.number(), insuranceType: z.string(),
  hundredCopay: z.number(), hundredUnpaid: z.number(),
  salaryTotal: z.number(), claimAmount: z.number(), copay: z.number(), nonCovered: z.number(),
  totalCopay: z.number(), welfareSupport: z.number(), disabledSupport: z.number(), supportAmount: z.number(),
  healthLivingExpense: z.number(), actualPaid: z.number(), discount: z.number(), discountReason: z.string(),
  card: z.number(), cash: z.number(), transfer: z.number(), outstanding: z.number(), refund: z.number(),
  outstandingOccurred: z.number(), outstandingRecovered: z.number(), outstandingCard: z.number(),
  outstandingCash: z.number(), outstandingTransfer: z.number(), refundOccurred: z.number(),
  cashReceipt: z.number(), closed: z.boolean(),
})

const visionReceiptSchema = z.object({
  id: z.string(), receiptDate: z.string(), chartNo: z.string(), patientName: z.string(), surgeon: z.string(),
  customerGrade: z.string(), surgeryDate: z.string(), procedureRight: z.string(), procedureLeft: z.string(),
  counselor: z.string(), category: z.string(), status: z.enum(['결제처리', '결제취소']),
  amount: z.number(), taxable: z.number(), exempt: z.number(),
  paymentMethod: z.string(), acquirer: z.string(), cardCompany: z.string(),
  paymentMode: z.string(), productName: z.string(), itemAmounts: z.record(z.string(), z.number()),
  registeredBy: z.string(), registeredAt: z.string(), paymentMemo: z.string(),
})

const medicalMonthlySchema = z.object({
  year: z.number(), month: z.number(), count: z.number(), net: z.number(), claim: z.number(),
  salaryTotal: z.number(), nonCovered: z.number(),
})
const visionMonthlySchema = z.object({
  year: z.number(), month: z.number(), count: z.number(), amount: z.number(),
})
const statusSchema = z.object({
  medicalFrom: z.string().nullable(), medicalTo: z.string().nullable(), medicalLoadedAt: z.string().nullable(),
  medicalMonthlyFromYear: z.number().nullable(),
  visionFrom: z.string().nullable(), visionTo: z.string().nullable(), visionLoadedAt: z.string().nullable(),
})

const medicalResponseSchema = apiResponseOf(z.array(medicalReceiptSchema))
const visionResponseSchema = apiResponseOf(z.array(visionReceiptSchema))
const medicalMonthlyResponseSchema = apiResponseOf(z.array(medicalMonthlySchema))
const visionMonthlyResponseSchema = apiResponseOf(z.array(visionMonthlySchema))
const statusResponseSchema = apiResponseOf(statusSchema)

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
