import { z } from 'zod'
import { apiResponseOf, withQuery } from '@/api/_shared'
import { api } from '@/api/client'
import {
  MEDICAL_RECEIPT_MOCK,
  MEDICAL_MONTHLY_MOCK,
  VISION_RECEIPT_MOCK,
  VISION_MONTHLY_MOCK,
  type MedicalMonthlyMetric,
  type MedicalReceipt,
  type VisionMonthlyMetric,
  type VisionReceipt,
} from './mockData'

export type { MedicalMonthlyMetric, MedicalReceipt, VisionMonthlyMetric, VisionReceipt } from './mockData'

const medicalReceiptSchema = z.object({
  id: z.string(), receiptDate: z.string(), chartNo: z.string(), patientName: z.string(), doctor: z.string(),
  receiptStaff: z.string(), receiptType: z.string(), revenueType: z.string(), room: z.string(),
  status: z.enum(['정상', '취소']), receiptTime: z.string(), serialNo: z.number(),
  insuranceType: z.enum(['급여1종', '급여2종', '미수입금', '보험', '보호(100/100)', '일반', '환불금']),
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
  counselor: z.string(), procedure: z.string(), category: z.string(), status: z.enum(['결제처리', '결제취소']),
  amount: z.number(), taxable: z.number(), exempt: z.number(),
  paymentMethod: z.enum(['카드', '현금', '현금영수', '통장']), acquirer: z.string(), cardCompany: z.string(),
  paymentMode: z.enum(['단말기', '수동']), productName: z.string(), itemAmounts: z.record(z.string(), z.number()),
  registeredBy: z.string(), registeredAt: z.string(), paymentMemo: z.string(),
})

const medicalResponseSchema = apiResponseOf(z.array(medicalReceiptSchema))
const visionResponseSchema = apiResponseOf(z.array(visionReceiptSchema))
const medicalMonthlySchema = z.object({
  year: z.number(), month: z.number(), count: z.number(), net: z.number(), claim: z.number(),
  salaryTotal: z.number(), nonCovered: z.number(),
})
const visionMonthlySchema = z.object({
  year: z.number(), month: z.number(), count: z.number(), amount: z.number(),
})
const medicalMonthlyResponseSchema = apiResponseOf(z.array(medicalMonthlySchema))
const visionMonthlyResponseSchema = apiResponseOf(z.array(visionMonthlySchema))
const useRealApi = import.meta.env.VITE_ACCOUNTING_DATA_SOURCE === 'api'

const inRange = <T extends { receiptDate: string }>(rows: T[], from: string, to: string): T[] =>
  rows.filter((row) => row.receiptDate >= from && row.receiptDate <= to)

export const accountingApi = {
  getMedicalReceipts: async (from: string, to: string): Promise<MedicalReceipt[]> => {
    if (!useRealApi) return inRange(MEDICAL_RECEIPT_MOCK, from, to)
    const response = await api.get<unknown>(withQuery('/accounting/medical-receipts', { from, to }))
    return medicalResponseSchema.parse(response).data
  },
  getVisionReceipts: async (from: string, to: string): Promise<VisionReceipt[]> => {
    if (!useRealApi) return inRange(VISION_RECEIPT_MOCK, from, to)
    const response = await api.get<unknown>(withQuery('/accounting/vision-receipts', { from, to }))
    return visionResponseSchema.parse(response).data
  },
  getMedicalMonthly: async (): Promise<MedicalMonthlyMetric[]> => {
    if (!useRealApi) return MEDICAL_MONTHLY_MOCK
    const response = await api.get<unknown>('/accounting/medical-receipts/monthly')
    return medicalMonthlyResponseSchema.parse(response).data
  },
  getVisionMonthly: async (): Promise<VisionMonthlyMetric[]> => {
    if (!useRealApi) return VISION_MONTHLY_MOCK
    const response = await api.get<unknown>('/accounting/vision-receipts/monthly')
    return visionMonthlyResponseSchema.parse(response).data
  },
}
