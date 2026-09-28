import { useQuery } from '@tanstack/react-query'
import { batchApi } from '../api'

/** 마지막 성공한 DAILY 배치 정보(target 날짜 + 완료 시각). 1분 캐싱. */
export function useBatchLastSuccess() {
  return useQuery({
    queryKey: ['batch', 'last-success'],
    queryFn: batchApi.lastSuccess,
    staleTime: 60_000,
  })
}
