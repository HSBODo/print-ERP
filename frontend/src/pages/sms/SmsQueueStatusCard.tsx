import { useState } from 'react'
import { AlertCircle, ChevronDown, ChevronUp, Play, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useRunQueueNow, useSmsQueueStatus } from '@/hooks/sms/useSmsQueue'
import { SmsFailedQueueModal } from './SmsFailedQueueModal'

/**
 * 자동 발송 큐 상태 요약 카드 — 문자 발송 리스트 상단 접힘 카드.
 *
 * <b>표시</b>
 *   · 상태별 카운트 (PENDING · PROCESSING · DONE · FAILED · CANCELED)
 *   · 오늘 처리량 (done_today) — daily-limit 대비
 *   · [실패 재실행] 버튼 → FAILED 재실행 모달
 *   · [지금 실행] 버튼 → 5분 폴러 즉시 트리거
 *
 * <b>동작</b>
 *   30초마다 자동 갱신. Phase 2 배치가 비활성(SMS_DISPATCH_ENABLED=false) 이어도
 *   카드는 표시 — 큐 상태(과거 임의 실행분·수동 실행분) 를 보여준다.
 */
export function SmsQueueStatusCard() {
  const [collapsed, setCollapsed] = useState(false)
  const [failedOpen, setFailedOpen] = useState(false)
  const { data, isLoading, isError, refetch, isFetching } = useSmsQueueStatus()
  const runNow = useRunQueueNow()

  const counts = (data?.counts ?? {}) as Partial<Record<'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED' | 'CANCELED', number>>
  const pending = counts.PENDING ?? 0
  const processing = counts.PROCESSING ?? 0
  const done = counts.DONE ?? 0
  const failed = counts.FAILED ?? 0
  const canceled = counts.CANCELED ?? 0
  const doneToday = data?.done_today ?? 0

  const doRunNow = () => {
    runNow.mutate(undefined, {
      onSuccess: (stats) => {
        toast.success(
          `큐 실행됨 — 성공 ${stats.sent ?? 0} · 실패 ${stats.failed ?? 0} · 대기 ${stats.skipped ?? 0}`
        )
      },
      onError: (err) => toast.error(`큐 실행 실패: ${(err as Error).message}`),
    })
  }

  return (
    <div className="mb-2 rounded-md border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50"
        aria-expanded={!collapsed}
      >
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-900">자동 발송 큐</span>
          {failed > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
              <AlertCircle className="h-3 w-3" />실패 {failed}
            </span>
          )}
          <span className="text-[11px] font-normal text-gray-500">
            대기 {pending} · 처리중 {processing} · 오늘 {doneToday}
          </span>
        </span>
        {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>

      {!collapsed && (
        <div className="border-t border-gray-100 p-3">
          {isLoading && <p className="py-4 text-center text-xs text-gray-500">불러오는 중…</p>}
          {isError && <p className="py-4 text-center text-xs text-red-600">큐 상태를 불러오지 못했습니다.</p>}
          {!isLoading && !isError && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="grid grid-cols-5 gap-2 text-center">
                <StatusChip label="대기" value={pending} color="text-blue-700 bg-blue-50" />
                <StatusChip label="처리중" value={processing} color="text-amber-700 bg-amber-50" />
                <StatusChip label="완료" value={done} color="text-emerald-700 bg-emerald-50" />
                <StatusChip label="실패" value={failed} color="text-red-700 bg-red-50" />
                <StatusChip label="취소" value={canceled} color="text-gray-600 bg-gray-100" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-500">오늘 처리 {doneToday}</span>
                <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                  <RefreshCw className={`mr-1 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                  새로고침
                </Button>
                {failed > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setFailedOpen(true)}
                  >
                    실패 재실행
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={doRunNow}
                  disabled={runNow.isPending}
                  title="큐를 지금 한 번 폴링해 발송을 시도합니다."
                >
                  <Play className="mr-1 h-3.5 w-3.5" />
                  {runNow.isPending ? '실행 중…' : '지금 실행'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <SmsFailedQueueModal open={failedOpen} onClose={() => setFailedOpen(false)} />
    </div>
  )
}

function StatusChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`min-w-[64px] rounded-md px-2 py-1 ${color}`}>
      <div className="text-[10px] font-medium">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  )
}
