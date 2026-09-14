import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  channelProfitApi,
  type AdSpend,
  type ChannelLensCost,
  type LensCost,
} from '@/api/marketing/channelProfit'

/** 채널별 렌즈원가(안 단위). 조회 기간의 실제 수술명 기준이라 추정이 아니다. */
export function useChannelLensCost(from: string, to: string, enabled = true) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['channel-lens-cost', from, to],
    queryFn: () => channelProfitApi.getChannelLensCost(from, to),
    enabled: enabled && Boolean(from && to),
  })
  return { rows: (data ?? []) as ChannelLensCost[], isLoading, isError }
}

/** 그 달의 매체별 광고비. 입력 전이면 빈 배열이라 화면이 0 으로 채운다. */
export function useAdSpend(ym: string, enabled = true) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['ad-spend', ym],
    queryFn: () => channelProfitApi.getAdSpend(ym),
    enabled: enabled && Boolean(ym),
  })
  return { rows: (data ?? []) as AdSpend[], isLoading, isError }
}

/** 렌즈 단가표. 유형 목록은 마트가 미리 넣어 두므로 비어 있지 않다(단가만 0). */
export function useLensPrices(enabled = true) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['lens-price'],
    queryFn: () => channelProfitApi.getLensPrices(),
    enabled,
  })
  return { rows: (data ?? []) as LensCost[], isLoading, isError }
}

/**
 * 광고비 저장. 성공하면 그 달의 광고비와 **모든 채널 렌즈원가 캐시**를 무효화한다 —
 * 공헌이익 ROAS 가 광고비에 걸려 있어 한쪽만 갱신하면 화면 숫자가 어긋난다.
 */
export function useSaveAdSpend(ym: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items: AdSpend[]) => channelProfitApi.saveAdSpend(items),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ad-spend', ym] })
    },
  })
}

/** 렌즈 단가 저장. 단가가 바뀌면 채널별 렌즈원가가 전부 달라지므로 함께 무효화한다. */
export function useSaveLensPrices() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items: LensCost[]) => channelProfitApi.saveLensPrices(items),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lens-price'] })
      void qc.invalidateQueries({ queryKey: ['channel-lens-cost'] })
    },
  })
}
