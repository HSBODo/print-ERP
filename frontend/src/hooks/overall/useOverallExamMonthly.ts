import { useQuery } from '@tanstack/react-query'
import { overallApi, type OverallExamMonthlyItem } from '@/api/overall'

/**
 * 월별 검사자 종합지표 — 연도별 월 단위 운영 DB 라이브 집계 (2026+ 만).
 * 24·25 는 API에 없고 페이지에서 레거시 하드코딩과 병합 렌더한다.
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
