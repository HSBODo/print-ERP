import { useQuery } from '@tanstack/react-query'
import { examApi } from '../api'
import type { AllExamListItem } from '../type/api'

/**
 * 전체 검사자 리스트 조회 훅. 검사일 범위(from~to)로 서버 조회.
 * EXAM(시력교정) + Cataract_Exam(백내장) 통합. 검사구분·내원동기·직업 필터는 페이지에서 클라이언트 사이드 적용.
 * 실 데이터 전용(mock 없음).
 */
export function useAllExamList(from: string, to: string, enabled = true) {
  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['all-exam-list', from, to],
    queryFn: () => examApi.getAllExamList(from, to),
    enabled: enabled && Boolean(from && to),
  })

  return {
    rows: enabled ? ((data ?? []) as AllExamListItem[]) : [],
    isLoading,
    isFetching,
    isError,
  }
}
