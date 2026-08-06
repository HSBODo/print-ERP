import { z } from 'zod'
import { api } from '../client'
import { apiResponseOf } from '../_shared'

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
  surgery: z.number(),
})

export type ReservationChannelFunnelItem = z.infer<typeof reservationChannelFunnelItemSchema>

const responseSchema = apiResponseOf(z.array(reservationChannelFunnelItemSchema))

export const reservationChannelApi = {
  getFunnel: async (from: string, to: string): Promise<ReservationChannelFunnelItem[]> => {
    const res = await api.get<unknown>(
      `/stats/reservation-channel?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    )
    return responseSchema.parse(res).data
  },
}
