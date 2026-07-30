import { useQuery } from '@tanstack/react-query'
import { examCountApi, type ExamCount } from '@/api/exam/examCount'

/**
 * 검사수 범위 조회 훅 — 마트(list_exam + list_cataract_exam) 원시 COUNT.
 * 전체 검사자 리스트 조회건수(사람) 옆 참고 지표. 조회 후에만 호출.
 */
export function useExamCount(from: string, to: string, enabled = true) {
  const { data } = useQuery({
    queryKey: ['exam-count', from, to],
    queryFn: () => examCountApi.getExamCount(from, to),
    enabled: enabled && Boolean(from && to),
  })

  return { examCount: data as ExamCount | undefined }
}
