import { useQuery } from '@tanstack/react-query'

import { overallApi } from '../api'
import type { OverallExamWeeklyItem } from '../type/api'

/**
 * 주간 검사자 종합지표 — 연도별 주(월~일, 월 경계 클립) 운영 DB 라이브 집계.
 * EXAM/Cataract_Exam 스냅샷 특성상 과거 주 수치가 사후 미세 변동할 수 있어 캐시는 짧게 둔다.
 */
export function useOverallExamWeekly(years: number[]) {
  const { data, isLoading, isError } = useQuery<OverallExamWeeklyItem[]>({
    queryKey: ['overall-exam-weekly', years],
    queryFn: ({ signal }) => overallApi.getOverallExamWeekly(years, signal),
    enabled: years.length > 0,
  })

  return {
    items: data ?? [],
    isLoading,
    isError,
  }
}
