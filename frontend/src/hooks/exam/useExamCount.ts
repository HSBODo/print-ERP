import { useQuery } from '@tanstack/react-query'
import { examCountApi, type ExamCount } from '@/api/exam/examCount'

/**
 * 검사수(월간 레포트 기준) 범위 조회 훅 — EXAM 행수 + Cataract_Exam 세션수.
 * 전체 검사자 리스트 조회건수(사람) 옆 참고 지표. 조회 후에만 조회.
 */
export function useExamCount(from: string, to: string, enabled = true) {
  const { data } = useQuery({
    queryKey: ['exam-count', from, to],
    queryFn: () => examCountApi.getExamCount(from, to),
    enabled: enabled && Boolean(from && to),
  })

  return { examCount: data as ExamCount | undefined }
}
