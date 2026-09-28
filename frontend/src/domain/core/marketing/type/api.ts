import { z } from 'zod'
import { apiResponseOf } from '#shared/api/utils'

/**
 * 누적 안수 리스트 — 원천 OPERATION_ACCUMULATED_EYE_COUNT 를 마트({@code list_accumulated_eyes})에서 조회.
 * 백엔드: GET /api/accumulated-eyes?from&to&query → ApiResponse<List<AccumulatedEyeRow>>.
 *
 * 한 사람 양안이면 R/L 각 1행으로 온다(눈 단위). accumulatedEyeCount 는 그 눈이 몇 번째 안수인지.
 */
const accumulatedEyeItemSchema = z.object({
  id: z.string(),
  custNum: z.string(),
  customName: z.string(),
  customPhone: z.string(),
  operationCategory: z.string(),
  operationCode: z.string(),
  operationDate: z.string(),           // YYYY-MM-DD
  accumulatedEyeCount: z.number(),
  eyePosition: z.string(),             // 'R' | 'L' | ''
  createDate: z.string().nullish(),
  lastModifiedDate: z.string().nullish(),
})

export type AccumulatedEyeItem = z.infer<typeof accumulatedEyeItemSchema>

export const accumulatedEyeResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(accumulatedEyeItemSchema),
  message: z.string().nullish(),
})

/** 검색 대상 필드 — 백엔드 SQL 의 :field 파라미터와 값이 일치해야 한다. */
export type AccumulatedEyesField = 'all' | 'name' | 'chart' | 'phone' | 'eyes'

export const accumulatedEyeTotalSchema = z.object({
  success: z.boolean(),
  data: z.object({ total: z.number() }),
  message: z.string().nullish(),
})

/**
 * 채널별 수익성 — 화면이 쓰는 값 중 **퍼널 API 에 없던 것**만 담당한다.
 *
 * 수술완료·수납액·전환율·재수술은 `/api/stats/reservation-channel` 이 이미 내려준다.
 * 여기는 CRM 에 존재하지 않아 사람이 입력해야 하는 두 값(광고비·렌즈단가)과,
 * 그 단가로 계산한 채널별 렌즈원가다.
 */

/* ── 채널별 렌즈원가 ── */

export const channelLensCostSchema = z.object({
  channel: z.string(),
  /** 렌즈가 들어가는 수술의 총 안수(양안이면 2) */
  lensEyes: z.number(),
  lensEyesPriced: z.number(),
  /** 단가 미입력 안수. 0 보다 크면 원가·공헌이익은 미완성이다 */
  lensEyesUnpriced: z.number(),
  lensCostManwon: z.number(),
})
export type ChannelLensCost = z.infer<typeof channelLensCostSchema>

/* ── 광고비 ── */

/**
 * 광고 상품 코드. 유입채널이 아니라 **광고를 집행하는 상품**이다.
 * 검색광고는 유입이 홈페이지·인콜·네이버로 흩어져 매출 귀속이 안 되지만,
 * 전체 광고비를 알려면 비용은 기록해야 한다.
 */
export const AD_MEDIA = ['naver_reserve', 'naver_search', 'modoodoc'] as const
export type AdMedia = (typeof AD_MEDIA)[number]

export const adSpendSchema = z.object({
  ym: z.string(),
  media: z.string(),
  amountManwon: z.number(),
})
export type AdSpend = z.infer<typeof adSpendSchema>

/* ── 렌즈 단가 ── */

export const lensCostSchema = z.object({
  /** surgery_op_type() 코드 — icl · tIcl · kpl · tKpl · viva */
  opType: z.string(),
  /** 안(眼) 1개당 매입 단가(만원). 0 이면 미입력 */
  unitCostManwon: z.number(),
})
export type LensCost = z.infer<typeof lensCostSchema>

export const lensCostListRes = apiResponseOf(z.array(channelLensCostSchema))
export const adSpendListRes = apiResponseOf(z.array(adSpendSchema))
export const lensPriceListRes = apiResponseOf(z.array(lensCostSchema))
export const savedRes = apiResponseOf(z.object({ saved: z.number() }))

/**
 * 예약통계_채널별 — 예약자 리스트를 채널로 묶은 퍼널.
 *
 * 단계는 뒤로 갈수록 앞 단계의 부분집합이다(예약 ⊇ 취소제외 ⊇ 접수 ⊇ 검사 ⊇ 수술).
 * 사람이 아니라 **예약 건** 단위 — 같은 사람이 취소하고 다시 잡으면 2건이다.
 */
export const reservationChannelFunnelItemSchema = z.object({
  channel: z.string(),
  reserved: z.number(),
  notCancel: z.number(),
  visited: z.number(),
  examined: z.number(),
  notStop: z.number(),
  surgery: z.number(),
  /** 실제 수술일이 있는 건(= 수술 완료). surgery − surgeryDone 이 수술 대기다. */
  surgeryDone: z.number(),
  /** 나중에 재수술까지 간 건 — 코호트 기준이라 최근 달일수록 0 이다(정상). */
  reop: z.number(),
  /** 수술 수납액 합(원). 아직 수술 전이면 0 이라 인원보다 늦게 찬다. */
  surgeryAmount: z.number(),
  // 사람 수 — 같은 사람이 그 달에 두 번 예약하면 건수 2 · 사람수 1.
  // ⚠️ 채널별 DISTINCT 라 채널 합계 ≠ 전체 사람수. 합계행은 total* 을 쓸 것.
  reservedPersons: z.number(),
  notCancelPersons: z.number(),
  visitedPersons: z.number(),
  examinedPersons: z.number(),
  notStopPersons: z.number(),
  surgeryPersons: z.number(),
  surgeryDonePersons: z.number(),
  reopPersons: z.number(),
  /** 실제 수납이 잡힌 사람 수 — 객단가 분모. 수술등록 인원과 다르다(수술 전이면 0원). */
  surgeryPaidPersons: z.number(),
  totalReservedPersons: z.number(),
  totalNotCancelPersons: z.number(),
  totalVisitedPersons: z.number(),
  totalExaminedPersons: z.number(),
  totalNotStopPersons: z.number(),
  totalSurgeryPersons: z.number(),
  totalSurgeryDonePersons: z.number(),
  totalReopPersons: z.number(),
  totalSurgeryAmount: z.number(),
  totalSurgeryPaidPersons: z.number(),
})

export type ReservationChannelFunnelItem = z.infer<typeof reservationChannelFunnelItemSchema>

export const reservationChannelFunnelResponseSchema = apiResponseOf(z.array(reservationChannelFunnelItemSchema))

/**
 * 채널 × 실제 수술 유형. channel 이 null 이면 전체 기준 행이다.
 * 수술명(OPERATIONDATA)에서 분류한 값이라 추정이 아니다.
 */
export const reservationChannelOpTypeSchema = z.object({
  channel: z.string().nullable(),
  opType: z.string(),
  persons: z.number(),
})
export type ReservationChannelOpType = z.infer<typeof reservationChannelOpTypeSchema>
export const opTypeResponseSchema = apiResponseOf(z.array(reservationChannelOpTypeSchema))
