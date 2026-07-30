import { useQuery } from '@tanstack/react-query'
import { examCountApi, type ExamCountByClassRow } from '@/api/exam/examCount'

/**
 * 고객분류별 검사수(월간 레포트 도표 #7) — 한 해의 (월 × 내원동기(레포트)) 건수.
 * 24·25 는 이 분류가 확정되기 전이라 레거시 확정값에 없다. 당해연도 단일 연도만 조회한다.
 */
export function useExamCountByClass(year: number) {
  const { data, isLoading, isError } = useQuery<ExamCountByClassRow[]>({
    queryKey: ['exam-count-by-class', year],
    queryFn: () => examCountApi.getExamCountByClass(year),
    enabled: Number.isFinite(year),
  })

  return { rows: data ?? [], isLoading, isError }
}
