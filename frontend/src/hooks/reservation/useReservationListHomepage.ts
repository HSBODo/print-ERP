import { useQuery } from '@tanstack/react-query'
import {
  reservationListHomepageApi,
  type ReservationListHomepageItem,
} from '@/api/reservation/reservationListHomepage'

/**
 * 예약자 리스트_홈페이지 조회 훅. 등록일 범위(from~to)로 서버 조회.
 * 구분·예약구분·검색 필터는 페이지에서 클라이언트 사이드로 적용한다(형제 리스트 페이지와 동일).
 */
export function useReservationListHomepage(from: string, to: string, enabled = true) {
  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['reservation-list-homepage', from, to],
    queryFn: () => reservationListHomepageApi.getReservationListHomepage(from, to),
    enabled: enabled && Boolean(from && to),
  })

  return {
    rows: enabled ? (data?.rows ?? []) as ReservationListHomepageItem[] : [],
    lastRegDate: enabled ? (data?.lastRegDate ?? '') : '',
    // 실시간 소스면 '스냅샷 초과' 경고가 의미 없다 → 배너를 끈다.
    // 응답 전(undefined)에는 false 로 둔다 — 스냅샷 가정이 안전한 기본값이다(경고를 놓치는 쪽보다 낫다).
    live: enabled ? (data?.live ?? false) : false,
    isLoading,
    isFetching,
    isError,
  }
}
