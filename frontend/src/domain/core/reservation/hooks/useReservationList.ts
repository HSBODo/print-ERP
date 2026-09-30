import { useQuery } from '@tanstack/react-query'
import { reservationApi } from '../api'
import type { ReservationListItem } from '../type/api'

/**
 * 예약자 리스트 조회 훅. 예약일 범위(from~to)로 서버 조회 (월 또는 주 단위).
 * rows(명단)를 반환한다 — 명단 합계 = 예약 종합(카카오 미포함).
 * 주차 그룹·진료구분·검색 필터는 페이지에서 클라이언트 사이드로 적용한다.
 * 실 데이터 전용(mock 없음) — RESERVATION 대용량이라 좁은 범위로만 조회한다.
 */
export function useReservationList(from: string, to: string, enabled = true) {
  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['reservation-list', from, to],
    queryFn: ({ signal }) =>
      reservationApi.getReservationList(from, to, signal),
    enabled: enabled && Boolean(from && to),
  })

  return {
    rows: enabled ? ((data?.rows ?? []) as ReservationListItem[]) : [],
    isLoading,
    isFetching,
    isError,
  }
}
