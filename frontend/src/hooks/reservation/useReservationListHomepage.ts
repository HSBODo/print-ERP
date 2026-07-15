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
    snapshotMaxRegDate: enabled ? (data?.snapshotMaxRegDate ?? '') : '',
    isLoading,
    isFetching,
    isError,
  }
}
