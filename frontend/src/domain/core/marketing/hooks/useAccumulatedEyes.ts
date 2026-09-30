import { useQuery } from '@tanstack/react-query'

import { marketingApi } from '../api'
import type { AccumulatedEyesField } from '../type/api'

/**
 * 누적 안수 리스트 조회 훅.
 *   from/to  : 수술일(operation_date) 반개구간.
 *   query    : 검색 키워드(부분일치). 빈 문자열이면 필터 없음.
 *   field    : 검색 대상 컬럼('all' | 'name' | 'chart' | 'phone' | 'eyes'). 기본 'all'.
 */
export function useAccumulatedEyes(
  from: string,
  to: string,
  query: string,
  field: AccumulatedEyesField = 'all',
  enabled = true,
) {
  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: ['accumulated-eyes', from, to, query, field],
    queryFn: ({ signal }) =>
      marketingApi.getAccumulatedEyes(from, to, query, field, signal),
    enabled: enabled && Boolean(from && to),
    // 400(범위 초과 등) 응답은 재시도해도 계속 400 이라 즉시 실패를 노출.
    retry: false,
  })

  return {
    rows: enabled ? (data ?? []) : [],
    isLoading,
    isFetching,
    isError,
    /** 서버 응답의 message 를 그대로 담는다(예: "조회 기간은 최대 366일입니다."). */
    errorMessage: error instanceof Error ? error.message : null,
  }
}
