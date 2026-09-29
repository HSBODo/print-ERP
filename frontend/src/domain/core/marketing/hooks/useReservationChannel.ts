import { useQuery } from '@tanstack/react-query'
import { marketingApi } from '../api'
import type { ReservationChannelFunnelItem, ReservationChannelOpType } from '../type/api'

/**
 * 예약통계_채널별 조회 훅. 등록일 범위(from~to)로 채널별 퍼널을 받는다.
 * 예약자 리스트와 같은 원천(v_reservation_channel)이라 합계가 항상 맞는다.
 */
export function useReservationChannel(from: string, to: string, enabled = true) {
  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['reservation-channel', from, to],
    queryFn: ({ signal }) => marketingApi.getReservationChannelFunnel(from, to, signal),
    enabled: enabled && Boolean(from && to),
  })

  return {
    rows: (enabled ? data ?? [] : []) as ReservationChannelFunnelItem[],
    isLoading,
    isFetching,
    isError,
  }
}

/** 채널 × 실제 수술 유형. 유형별 패널이 쓴다. */
export function useReservationChannelOpTypes(from: string, to: string, enabled = true) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['reservation-channel-op-types', from, to],
    queryFn: ({ signal }) => marketingApi.getReservationChannelOpTypes(from, to, signal),
    enabled: enabled && Boolean(from && to),
  })
  return { rows: (data ?? []) as ReservationChannelOpType[], isLoading, isError }
}
