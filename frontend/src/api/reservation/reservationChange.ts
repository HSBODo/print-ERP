import { z } from 'zod'
import { api } from '@/api/client'
import { withQuery } from '@/api/_shared'

/**
 * 예약 변경이력 — 예약일이 1회 이상 바뀐 검사예약(시력교정·드림렌즈·백내장) 명단.
 * 백엔드: GET /api/reservation-change?from&to → ApiResponse<{rows}> (등록일 범위, camelCase 키).
 * 행 1개 = RESERVE_NUM 1개. 마트(list_reservation_change)는 변경된 예약만 담는다.
 *
 * changeChain: "YYYY-MM-DD HH:MM@YYYY-MM-DD|…" — 최초 예약일부터 순서대로(변경시각@그때의 예약일).
 *   시각을 못 읽은 이력은 "@날짜" 로 시각이 빈다. 해석은 pages/reservation/reservation-change/reservationChangeModel.ts.
 * regSource: H 변경이력 첫 저장 · I 등록시각 기록 · N 예약번호 채번일(날짜만 — 화면에 '채번' 표시).
 */
const reservationChangeItemSchema = z.object({
  reserveNum: z.string(),
  registeredAt: z.string(),
  registeredTime: z.string(),
  regSource: z.string(),
  chartNo: z.string(),
  name: z.string(),
  branch: z.string(), // M/D/H
  reserveState: z.string(), // Y/I/H/C
  firstDate: z.string(),
  finalDate: z.string(),
  changeCount: z.number(),
  changeChain: z.string(),
})

export type ReservationChangeItem = z.infer<typeof reservationChangeItemSchema>

const reservationChangeResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    rows: z.array(reservationChangeItemSchema),
  }),
  message: z.string().nullish(),
})

export interface ReservationChangeResult {
  rows: ReservationChangeItem[]
}

export const reservationChangeApi = {
  getReservationChanges: async (from: string, to: string): Promise<ReservationChangeResult> => {
    const res = await api.get<unknown>(withQuery('/reservation-change', { from, to }))
    return reservationChangeResponseSchema.parse(res).data
  },
}
