import { useQuery } from '@tanstack/react-query'
import { reservationChangeApi, type ReservationChangeItem } from '@/api/reservation/reservationChange'

/**
 * 예약 변경이력 조회 훅. 등록일 범위(from~to)로 서버 조회 — 보통 연도 하나, '연도 전체' 면 2022-01-01~오늘.
 * 기준일·구분·상태·변경횟수·검색은 페이지에서 클라이언트 사이드로 적용한다(체인 문자열 해석 포함).
 * 마트가 변경된 예약만 담아 수 년치도 3만 행 안쪽이라 넓은 범위를 한 번에 받는다.
 */
export function useReservationChange(from: string, to: string, enabled = true) {
  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['reservation-change', from, to],
    queryFn: () => reservationChangeApi.getReservationChanges(from, to),
    enabled: enabled && Boolean(from && to),
    staleTime: 5 * 60 * 1000,
  })

  return {
    rows: (data?.rows ?? []) as ReservationChangeItem[],
    isLoading,
    isFetching,
    isError,
  }
}
