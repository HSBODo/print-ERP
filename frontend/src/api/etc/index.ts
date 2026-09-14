import { z } from 'zod'
import { api } from '@/api/client'
import { apiResponseOf, withQuery } from '@/api/_shared'

/* ── Monthly (B2B 매출 페이지용) ── */

const b2bRevenueMonthlyItemSchema = z.object({
  year: z.number(), month: z.number(),
  totalRevenue: z.number(), caseCount: z.number(), avgRevenuePerCase: z.number(),
  visionRevenue: z.number(), cataractRevenue: z.number(),
  visionCount: z.number(), cataractCount: z.number(),
  designatedRevenue: z.number(), nonDesignatedRevenue: z.number(),
  designatedCount: z.number(), nonDesignatedCount: z.number(),
  opCost: z.number(), examCost: z.number(), dnaCost: z.number(),
  prpCost: z.number(), etcCost: z.number(),
  presbyopiaCost: z.number(), hospitalSupplyCost: z.number(),
})
export type B2bRevenueMonthlyItem = z.infer<typeof b2bRevenueMonthlyItemSchema>
const b2bRevenueResponseSchema = apiResponseOf(z.array(b2bRevenueMonthlyItemSchema))

export const b2bApi = {
  getB2bRevenueMonthly: async (years: number[]) =>
    b2bRevenueResponseSchema.parse(await api.get<unknown>(withQuery('/stats/b2b-revenue', { years }))).data,
}

/* ── 드림렌즈 장부 (직접 입력 테이블) ── */

/** 빈 셀은 서버가 null 로 주거나 키를 생략할 수 있어 nullish 로 받는다. */
const text = z.string().nullish()
const money = z.number()

const dreamlensLedgerRowSchema = z.object({
  id: z.number(),

  entryDate: z.string(),
  visitType: text,
  customerNo: text,
  customerName: text,
  examiner: text,
  purchaseType: text,

  rLensName: text, rBox: text, rLensSpec: text, rColor: text, rReturnDate: text,
  lLensName: text, lBox: text, lLensSpec: text, lColor: text, lReturnDate: text,

  dlNewRevenue: money, dlRepurchaseRevenue: money,
  mNewRevenue: money, mRepurchaseRevenue: money,
  hlNewRevenue: money, hlRepurchaseRevenue: money,
  depositRevenue: money, fittingRevenue: money,
  supplyRevenue: money, treatmentRevenue: money,
  /** 렌즈 정가(참고) — 매출 버킷은 실수납이라 할인·분납 시 둘이 다르다. 행 합계 미포함. */
  lensListPrice: money.catch(0),
  totalRevenue: money,

  /** 'AUTO' = 배치 초안(검안사가 렌즈 정보 보완 필요) / 'MANUAL' = 사람 입력·수정. */
  source: z.string().catch('MANUAL'),

  nextReservation: text,
  recall1: text, recall1Reservation: text, recall1Absent: text,
  recall2: text, recall2Reservation: text, recall2Absent: text,
  recall3: text, recall3Reservation: text, recall3Absent: text,
})
export type DreamlensLedgerRow = z.infer<typeof dreamlensLedgerRowSchema>

/** 서버가 계산·관리하는 값(id·합계·source)이라 저장 요청에서는 제외한다. */
export type DreamlensLedgerRequest = Omit<DreamlensLedgerRow, 'id' | 'totalRevenue' | 'source'>

const ledgerListSchema = apiResponseOf(z.array(dreamlensLedgerRowSchema))
const ledgerRowSchema = apiResponseOf(dreamlensLedgerRowSchema)

const toRequest = (row: DreamlensLedgerRow | DreamlensLedgerRequest): DreamlensLedgerRequest => {
  const { ...rest } = row as DreamlensLedgerRow
  delete (rest as Partial<DreamlensLedgerRow>).id
  delete (rest as Partial<DreamlensLedgerRow>).totalRevenue
  delete (rest as Partial<DreamlensLedgerRow>).source
  return rest
}

export const dreamlensLedgerApi = {
  list: async (from: string, to: string) =>
    ledgerListSchema.parse(await api.get<unknown>(withQuery('/dreamlens-ledger', { from, to }))).data,

  create: async (row: DreamlensLedgerRequest) =>
    ledgerRowSchema.parse(await api.post<unknown>('/dreamlens-ledger', toRequest(row))).data,

  update: async (id: number, row: DreamlensLedgerRow | DreamlensLedgerRequest) =>
    ledgerRowSchema.parse(await api.put<unknown>(`/dreamlens-ledger/${id}`, toRequest(row))).data,

  remove: async (id: number) => {
    await api.delete<unknown>(`/dreamlens-ledger/${id}`)
  },
}
