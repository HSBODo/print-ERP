import { z } from 'zod'
import { apiResponseOf } from '#shared/api/utils'

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

  rLensName: text,
  rBox: text,
  rLensSpec: text,
  rColor: text,
  rReturnDate: text,
  lLensName: text,
  lBox: text,
  lLensSpec: text,
  lColor: text,
  lReturnDate: text,

  dlNewRevenue: money,
  dlRepurchaseRevenue: money,
  mNewRevenue: money,
  mRepurchaseRevenue: money,
  hlNewRevenue: money,
  hlRepurchaseRevenue: money,
  depositRevenue: money,
  fittingRevenue: money,
  supplyRevenue: money,
  treatmentRevenue: money,
  /** 렌즈 정가(참고) — 매출 버킷은 실수납이라 할인·분납 시 둘이 다르다. 행 합계 미포함. */
  lensListPrice: money.catch(0),
  totalRevenue: money,

  /** 'AUTO' = 배치 초안(검안사가 렌즈 정보 보완 필요) / 'MANUAL' = 사람 입력·수정. */
  source: z.string().catch('MANUAL'),

  nextReservation: text,
  recall1: text,
  recall1Reservation: text,
  recall1Absent: text,
  recall2: text,
  recall2Reservation: text,
  recall2Absent: text,
  recall3: text,
  recall3Reservation: text,
  recall3Absent: text,
})
export type DreamlensLedgerRow = z.infer<typeof dreamlensLedgerRowSchema>

/** 서버가 계산·관리하는 값(id·합계·source)이라 저장 요청에서는 제외한다. */
export type DreamlensLedgerRequest = Omit<
  DreamlensLedgerRow,
  'id' | 'totalRevenue' | 'source'
>

export const ledgerListSchema = apiResponseOf(z.array(dreamlensLedgerRowSchema))
export const ledgerRowSchema = apiResponseOf(dreamlensLedgerRowSchema)
