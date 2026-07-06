import { useMemo, useState } from 'react'
import { Loader2, Play, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useBatchRerun, useBatchRunLogs } from '@/hooks/admin/useBatchAdmin'
import type { BatchRunLog } from '@/api/admin/batchAdmin'

type BatchJobOption = {
  value: string
  label: string
  description: string
}

const JOB_OPTIONS: BatchJobOption[] = [
  {
    value: 'rerun-all',
    label: '전체 도메인 재실행',
    description: '기간 내 전 도메인(수술·예약·검사·전환·외래·전체지표·기타)을 순차 재실행합니다. min-year 가드 우회.',
  },
]

const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const STATUS_STYLE: Record<BatchRunLog['status'], string> = {
  RUNNING: 'bg-blue-100 text-blue-700',
  SUCCESS: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
}

const formatDateTime = (iso: string | null) => {
  if (!iso) return '-'
  return iso.replace('T', ' ').slice(0, 19)
}

const formatDuration = (ms: number | null) => {
  if (ms == null) return '-'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const min = Math.floor(ms / 60_000)
  const sec = Math.floor((ms % 60_000) / 1000)
  return `${min}m ${sec}s`
}

export function BatchManagementPage() {
  const [jobType, setJobType] = useState<string>(JOB_OPTIONS[0].value)
  const [from, setFrom] = useState<string>(daysAgo(30))
  const [to, setTo] = useState<string>(daysAgo(1))
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true)

  const rerun = useBatchRerun()
  const isRunning = rerun.isPending
  const logsQuery = useBatchRunLogs(50, autoRefresh || isRunning)

  const selectedJob = useMemo(
    () => JOB_OPTIONS.find((option) => option.value === jobType) ?? JOB_OPTIONS[0],
    [jobType],
  )

  const handleRun = () => {
    if (!from || !to) return
    rerun.mutate({ from, to })
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">데이터 배치 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          마트 재적재 배치를 수동 실행하고 실행 이력을 확인합니다. (local/dev 환경 전용)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">배치 실행</CardTitle>
          <CardDescription>{selectedJob.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">배치 종류</span>
              <select
                value={jobType}
                onChange={(event) => setJobType(event.target.value)}
                disabled={isRunning}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {JOB_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">시작일 (from)</span>
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                disabled={isRunning}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">종료일 (to)</span>
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                disabled={isRunning}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>

            <Button onClick={handleRun} disabled={isRunning || !from || !to} className="gap-2">
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isRunning ? '실행 중...' : '실행'}
            </Button>

            {rerun.isError ? (
              <p className="text-sm text-red-600">
                실행 실패: {rerun.error instanceof Error ? rerun.error.message : String(rerun.error)}
              </p>
            ) : null}
            {rerun.isSuccess ? (
              <p className="text-sm text-emerald-700">
                요청 접수 완료 — 배치 결과는 아래 이력에서 확인
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">실행 이력 (batch_run_log)</CardTitle>
            <CardDescription>
              최근 50건. 자동 새로고침 활성 시 3초마다 갱신.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(event) => setAutoRefresh(event.target.checked)}
              />
              자동 새로고침
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logsQuery.refetch()}
              disabled={logsQuery.isFetching}
              className="gap-1"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${logsQuery.isFetching ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {logsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> 이력 로딩 중...
            </div>
          ) : logsQuery.isError ? (
            <p className="text-sm text-red-600">
              이력 조회 실패: {logsQuery.error instanceof Error ? logsQuery.error.message : String(logsQuery.error)}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">잡</th>
                    <th className="px-3 py-2 font-medium">타입</th>
                    <th className="px-3 py-2 font-medium">기간</th>
                    <th className="px-3 py-2 font-medium">상태</th>
                    <th className="px-3 py-2 font-medium text-right">행수</th>
                    <th className="px-3 py-2 font-medium">시작</th>
                    <th className="px-3 py-2 font-medium">종료</th>
                    <th className="px-3 py-2 font-medium text-right">소요</th>
                    <th className="px-3 py-2 font-medium">에러</th>
                  </tr>
                </thead>
                <tbody>
                  {(logsQuery.data ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-6 text-center text-muted-foreground">
                        실행 이력이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    (logsQuery.data ?? []).map((log) => (
                      <tr key={log.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-3 py-2 tabular-nums text-muted-foreground">{log.id}</td>
                        <td className="px-3 py-2 font-mono text-xs">{log.jobName}</td>
                        <td className="px-3 py-2">{log.runType}</td>
                        <td className="px-3 py-2 tabular-nums text-xs">
                          {log.targetFrom ?? '-'} ~ {log.targetTo ?? '-'}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[log.status]}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{log.rowsUpserted.toLocaleString()}</td>
                        <td className="px-3 py-2 tabular-nums text-xs">{formatDateTime(log.startedAt)}</td>
                        <td className="px-3 py-2 tabular-nums text-xs">{formatDateTime(log.finishedAt)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs">{formatDuration(log.durationMs)}</td>
                        <td className="px-3 py-2 max-w-[240px] truncate text-xs text-red-600" title={log.errorMessage ?? ''}>
                          {log.errorMessage ?? ''}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
