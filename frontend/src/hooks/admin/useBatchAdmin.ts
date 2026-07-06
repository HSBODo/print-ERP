import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { batchAdminApi } from '@/api/admin/batchAdmin'

const RUN_LOGS_KEY = ['admin', 'batch', 'run-logs'] as const

export const useBatchRunLogs = (limit = 50, autoRefresh = false) =>
  useQuery({
    queryKey: [...RUN_LOGS_KEY, limit],
    queryFn: () => batchAdminApi.listRunLogs(limit),
    refetchInterval: autoRefresh ? 3000 : false,
  })

export const useBatchRerun = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ from, to }: { from: string; to: string }) => batchAdminApi.rerunAll(from, to),
    onSettled: () => queryClient.invalidateQueries({ queryKey: RUN_LOGS_KEY }),
  })
}
