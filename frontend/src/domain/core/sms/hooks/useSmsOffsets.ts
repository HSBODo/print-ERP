import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { smsApi } from '../api'
import type { SmsOffsetRow, SmsOffsetUpdatePayload } from '../type/api'

const KEY = ['sms', 'offsets'] as const

/**
 * 오프셋 그리드 조회 — SMILE·LASIK·LASEK·ICL 4행.
 * SmsManagementPage 의 예정일 계산도 이 값을 참조하므로 캐시가 화면 전체와 정합해야 한다.
 */
export function useSmsOffsets() {
  return useQuery({
    queryKey: KEY,
    queryFn: ({ signal }) => smsApi.getOffsets(signal),
    staleTime: 60_000, // 편집 후 mutation 이 즉시 invalidate 하므로 stale-while-revalidate 충분
  })
}

/**
 * 오프셋 원자적 갱신 훅. 저장 성공 시 오프셋 캐시와 targets 캐시를 모두 무효화한다 —
 * 화면 예정일이 새 값으로 즉시 재계산되도록.
 */
export function useUpdateSmsOffsets() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: SmsOffsetUpdatePayload) =>
      smsApi.updateOffsets(payload),
    onSuccess: (rows: SmsOffsetRow[]) => {
      qc.setQueryData(KEY, rows)
      qc.invalidateQueries({ queryKey: ['sms', 'targets'] })
      qc.invalidateQueries({ queryKey: ['sms', 'templates'] })
    },
  })
}
