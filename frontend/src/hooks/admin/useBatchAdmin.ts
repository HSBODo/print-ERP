import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { batchAdminApi, type BatchDomain } from '@/api/admin/batchAdmin'

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
    mutationFn: ({ from, to, domain }: { from: string; to: string; domain: BatchDomain }) =>
      batchAdminApi.rerun(from, to, domain),
    onSettled: () => queryClient.invalidateQueries({ queryKey: RUN_LOGS_KEY }),
  })
}
