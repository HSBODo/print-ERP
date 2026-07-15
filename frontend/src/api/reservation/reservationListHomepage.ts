import { z } from 'zod'
import { api } from '@/api/client'
import { apiResponseOf, withQuery } from '@/api/_shared'

/**
 * 예약자 리스트_홈페이지 — 레거시 관리자 화면 `counsel/online_list.php`(SCR-39)의 온라인 예약 명단.
 *
 * 소스: 레거시 `TBL_COUNSEL` 을 `CATEGORY='COUNSELONLINE'` 으로 거른 단일 테이블(조인 없음).
 * 백엔드: GET /api/reservation-list-homepage?from&to → ApiResponse<{rows, snapshotMaxRegDate}>.
 *
 * 주의(레거시 원본 동작):
 *  - `regDate`(등록일) 기준 조회다. 예약일(`reserveDate`)이 아니다.
 *  - 화면 No 는 저장값이 아니라 표시용 행번호 — 식별자는 `legacyNo`(C_NO).
 *  - `examType` 라벨은 코드표가 아니라 레거시 PHP 하드코딩 → reservationListHomepageUtils.EXAM_TYPE_LABELS.
 */
const reservationListHomepageItemSchema = z.object({
  legacyNo: z.string(),
  deviceType: z.string(),
  name: z.string(),
  phone: z.string(),
  reserveDate: z.string(),
  reserveTime: z.string(),
  utmSource: z.string(),
  utmMedium: z.string(),
  utmCampaign: z.string(),
  referralCode: z.string(),
  examType: z.string(),
  surgeryTf: z.string(),
  isReserve: z.string(),
  regDate: z.string(),
})

export type ReservationListHomepageItem = z.infer<typeof reservationListHomepageItemSchema>

/**
 * `snapshotMaxRegDate` — 현재 소스가 담고 있는 마지막 등록일시.
 * 소스가 스냅샷(로컬 캐시)이면 그 시점 이후 구간은 건수가 조용히 모자라게 나오므로,
 * 화면이 조회 기간과 비교해 경고를 띄우는 데 쓴다. 실시간 소스면 사실상 '지금'이 된다.
 */
const reservationListHomepageResultSchema = z.object({
  rows: z.array(reservationListHomepageItemSchema),
  snapshotMaxRegDate: z.string(),
})

export type ReservationListHomepageResult = z.infer<typeof reservationListHomepageResultSchema>

const reservationListHomepageResponseSchema = apiResponseOf(reservationListHomepageResultSchema)

export const reservationListHomepageApi = {
  getReservationListHomepage: async (
    from: string,
    to: string,
  ): Promise<ReservationListHomepageResult> => {
    const res = await api.get<unknown>(withQuery('/reservation-list-homepage', { from, to }))
    return reservationListHomepageResponseSchema.parse(res).data
  },
}
