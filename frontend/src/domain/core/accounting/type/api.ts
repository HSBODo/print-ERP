import { z } from 'zod'
import { apiResponseOf } from '#shared/api/utils'

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

export const medicalResponseSchema = apiResponseOf(z.array(medicalReceiptSchema))
export const visionResponseSchema = apiResponseOf(z.array(visionReceiptSchema))
export const medicalMonthlyResponseSchema = apiResponseOf(z.array(medicalMonthlySchema))
export const visionMonthlyResponseSchema = apiResponseOf(z.array(visionMonthlySchema))
export const statusResponseSchema = apiResponseOf(statusSchema)

