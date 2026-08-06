import { z } from 'zod'
import { api } from '@/api/client'
import { withQuery } from '@/api/_shared'

/**
 * 예약자 리스트 — "예약 종합(콜·온라인)" 월간 건수를 구성하는 검사예약 행 목록.
 * 백엔드: GET /api/reservation-list?from&to → ApiResponse<{rows, kakaoCount}> (camelCase 키).
 * 집계 기준 날짜 = 등록일(registeredAt). 행 1개 = RESERVE_NUM 1개.
 * 명단 행 합계 = 예약 종합 값(둘 다 카카오 미포함). kakaoCount(해피톡 카카오)는 참고용 별도 표시.
 * 전 컬럼 문자열. reserveState: Y(예약)/I(접수)/H(퇴원)/C(취소).
 */
const reservationListItemSchema = z.object({
  registeredAt: z.string(),
  registeredTime: z.string(),
  reserveDate: z.string(),
  reserveTime: z.string(),
  chartNo: z.string(),
  name: z.string(),
  reserveState: z.string(),
  channel: z.string(), // 인콜/아웃콜/홈페이지/네이버
  channelGroup: z.string(), // 콜/온라인
  doctor: z.string(),
  counselor: z.string(),
  comment: z.string(),
  // 내원동기(중) — 실제 유입처("모두닥"·"인터넷검색(홈페이지)" 등).
  // 마트 재적재 전 옛 응답과의 호환을 위해 optional.
  motiveM: z.string().optional(),
  /** CRM = 등록값 · MEMO = 메모의 TM고객(대/중) 에서 추출 */
  motiveMSource: z.string().optional(),
  /** 예약 이후 첫 검사의 검사일(EXAM 에 등록 시각 컬럼이 없어 검사일을 쓴다) */
  examRegDate: z.string().optional(),
  /** 그 검사의 중단 여부 Y/N (검사 없으면 빈값) */
  examStop: z.string().optional(),
  /** 예약 이후 첫 수술예약(FLAG=O)을 잡은 날 — 날짜만 */
  surgeryRegDate: z.string().optional(),
})

export type ReservationListItem = z.infer<typeof reservationListItemSchema>

const reservationListResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    rows: z.array(reservationListItemSchema),
    kakaoCount: z.number(),
  }),
  message: z.string().nullish(),
})

export interface ReservationListResult {
  rows: ReservationListItem[]
  /** 카카오(해피톡) 건수 — 참고용. 예약 종합엔 미포함(명단 합계 = 예약 종합). */
  kakaoCount: number
}

export const reservationListApi = {
  getReservationList: async (from: string, to: string): Promise<ReservationListResult> => {
    const res = await api.get<unknown>(withQuery('/reservation-list', { from, to }))
    return reservationListResponseSchema.parse(res).data
  },
}
