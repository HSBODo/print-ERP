import { useQuery } from '@tanstack/react-query'
import { reportApi } from '../api'
import type { WeeklyReportItem } from '../type/api'

/**
 * 주차 레포트 — 연도별 ISO 주차 원시 집계(운영 DB 라이브).
 * EXAM/Cataract_Exam 스냅샷 특성상 과거 주 수치가 사후 미세 변동할 수 있어 오래 캐시하지 않는다.
 */
export function useWeeklyReport(years: number[]) {
  const { data, isLoading, isError } = useQuery<WeeklyReportItem[]>({
    queryKey: ['weekly-report', years],
    queryFn: () => reportApi.getWeeklyReport(years),
    enabled: years.length > 0,
  })

  return {
    items: data ?? [],
    isLoading,
    isError,
  }
}
