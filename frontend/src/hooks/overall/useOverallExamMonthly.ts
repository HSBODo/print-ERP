import { useQuery } from '@tanstack/react-query'
import { overallApi, type OverallExamMonthlyItem } from '@/api/overall'

/**
 * 월별 검사자 종합지표 — 연도별 월 단위 마트 집계 (24·25 SQL 시드 + 26+ 배치).
 * EXAM/Cataract_Exam 스냅샷 특성상 과거 월 수치가 사후 미세 변동할 수 있어 캐시는 짧게 둔다.
 */
export function useOverallExamMonthly(years: number[]) {
  const { data, isLoading, isError } = useQuery<OverallExamMonthlyItem[]>({
    queryKey: ['overall-exam-monthly', years],
    queryFn: () => overallApi.getOverallExamMonthly(years),
    enabled: years.length > 0,
  })

  return {
    items: data ?? [],
    isLoading,
    isError,
  }
}
