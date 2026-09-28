import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reservationStatsApi } from '../api'
import type { CataractEditableField } from '../type/api'

/**
 * 예약통계_백내장 일자별 카운트 조회 훅. from~to(등록일) 범위로 서버 조회.
 * 서버 GET이 당월·미잠금이면 D-1까지 자동 증분 채움(조회=호출 통합). 미연결(503) 시 isError → 미연결 안내.
 * refetch로 같은 월 재조회 시 강제 갱신(서버 자동 채움 재평가).
 */
export function useReservationStatsCataract(from: string, to: string, enabled = true) {
  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['reservation-stats-cataract', from, to],
    queryFn: () => reservationStatsApi.getCataractDailyCounts(from, to),
    enabled: enabled && Boolean(from && to),
    retry: false, // 503(미연결)은 재시도해도 동일 → 즉시 오류 상태
  })

  return { dailies: data?.data, meta: data?.meta, isLoading, isFetching, isError, refetch }
}

/**
 * 셀 손보정(인입콜/응대콜) 뮤테이션. 성공 시 백내장 조회 캐시를 무효화해 표를 갱신한다.
 * 휴가 등으로 라이브가 어긋나는 일자를 PDF/레거시 값으로 직접 고칠 때 사용.
 */
export function useReservationStatsCataractCellEdit() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({
      period,
      date,
      field,
      value,
    }: {
      period: string
      date: string
      field: CataractEditableField
      value: number
    }) => reservationStatsApi.editCataractCell(period, date, field, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservation-stats-cataract'] })
    },
  })

  return { editCell: mutation.mutateAsync, isEditing: mutation.isPending }
}

/** 스냅샷 vs 라이브 진단(diff) 뮤테이션. */
export function useReservationStatsCataractSnapshots() {
  const diff = useMutation({
    mutationFn: (period: string) => reservationStatsApi.getCataractDiff(period),
  })
  const drillDown = useMutation({
    mutationFn: ({ period, date, field }: { period: string; date: string; field: string }) =>
      reservationStatsApi.getCataractDrillDown(period, date, field),
  })
  const parity = useMutation({
    mutationFn: ({ period, field }: { period: string; field: string }) =>
      reservationStatsApi.getCataractParity(period, field),
  })

  return {
    getDiff: diff.mutateAsync,
    isDiffing: diff.isPending,
    getDrillDown: drillDown.mutateAsync,
    isDrillingDown: drillDown.isPending,
    getParity: parity.mutateAsync,
    isCheckingParity: parity.isPending,
  }
}
