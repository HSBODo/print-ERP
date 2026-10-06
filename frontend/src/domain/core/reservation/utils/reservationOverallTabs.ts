/** 예약 종합 탭 — 탭마다 그리는 값(field)과 제목·설명 */
export type ReservationOverallTab = 'total' | 'online' | 'call'

export const RESERVATION_OVERALL_TABS: {
  key: ReservationOverallTab
  field: 'reservations' | 'online' | 'call'
  label: string
  title: string
  description: string
}[] = [
  {
    key: 'total',
    field: 'reservations',
    label: '예약 종합',
    title: '예약 종합 (콜, 온라인)',
    description:
      '검사예약을 콜(CTI·TM·재상담)과 온라인(홈페이지/앱·네이버·카카오톡)으로 합산한 종합 건수입니다. ' +
      '2024·2025년은 레거시 BCRM 문의통계 확정값, 2026년은 운영 DB 추정치(검사예약 전체)이며 당월까지만 신뢰할 수 있습니다.',
  },
  {
    key: 'online',
    field: 'online',
    label: '온라인 예약',
    title: '온라인 예약 (네이버, 카카오, 홈페이지)',
    description:
      '온라인 채널(홈페이지/앱 + 네이버) 검사예약 건수입니다. 2024·2025년은 확정값, ' +
      '2026년은 운영 DB 추정치(RESERVE_PATH ONLINE·APP·NAVER)입니다. 카카오는 해피톡 채널로 RESERVATION에 거의 잡히지 않습니다.',
  },
  {
    key: 'call',
    field: 'call',
    label: '콜 예약',
    title: '콜 예약 (인콜, 아웃콜)',
    description:
      '콜 채널(인콜 CTI + 아웃콜 CRM) 검사예약 건수입니다. 2024·2025년은 확정값, ' +
      '2026년은 운영 DB 추정치(RESERVE_PATH CTI·CRM)입니다. 종합에서 온라인을 뺀 값과 같은 개념입니다.',
  },
]
