import { z } from 'zod'
import { api } from '#shared/api/client'
import { apiResponseOf } from '#shared/api/utils'

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

const responseSchema = apiResponseOf(z.array(reservationChannelFunnelItemSchema))

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
const opTypeResponseSchema = apiResponseOf(z.array(reservationChannelOpTypeSchema))

export const reservationChannelApi = {
  getFunnel: async (from: string, to: string): Promise<ReservationChannelFunnelItem[]> => {
    const res = await api.get<unknown>(
      `/stats/reservation-channel?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    )
    return responseSchema.parse(res).data
  },

  getOpTypes: async (from: string, to: string): Promise<ReservationChannelOpType[]> => {
    const res = await api.get<unknown>(
      `/stats/reservation-channel/op-types?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    )
    return opTypeResponseSchema.parse(res).data
  },
}
