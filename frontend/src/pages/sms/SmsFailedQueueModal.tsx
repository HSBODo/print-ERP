import { useMemo, useState } from 'react'
import { RefreshCw, RotateCcw, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useRetryQueueRows, useSmsQueueRows } from '@/hooks/sms/useSmsQueue'

/**
 * 실패·취소 큐 재실행 모달.
 *
 * <b>동작</b>
 *   · 기본 FAILED 목록 표시 · 탭으로 CANCELED 전환 가능
 *   · 체크박스로 선택 → [재실행] → attempt_count 0 리셋 후 PENDING
 *   · 재실행 후 5분 폴러가 자연스럽게 잡음
 */
export function SmsFailedQueueModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<'FAILED' | 'CANCELED'>('FAILED')
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const { data, isLoading, isError, refetch, isFetching } = useSmsQueueRows(tab, 200, open)
  const retryMutation = useRetryQueueRows()

  const rows = useMemo(() => data ?? [], [data])
  const allSelected = useMemo(() => rows.length > 0 && rows.every((r) => selected.has(r.id)), [rows, selected])

  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(rows.map((r) => r.id)))
  }

  const toggleOne = (id: number) => {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const doRetry = () => {
    if (selected.size === 0) return
    retryMutation.mutate(Array.from(selected), {
      onSuccess: (count) => {
        toast.success(`${count}건 재실행 대기열에 다시 넣었습니다 — 다음 폴링에서 시도합니다.`)
        setSelected(new Set())
      },
      onError: (err) => toast.error(`재실행 실패: ${(err as Error).message}`),
    })
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="자동 발송 실패 재실행"
    >
      <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">자동 발송 실패 재실행</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              max-attempts 도달 · 취소된 큐 행을 다시 대기열에 넣습니다. attempt_count 는 0 으로 리셋됩니다.
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`mr-1 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />새로고침
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="닫기">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 상태 탭 */}
        <div className="flex items-center gap-1 border-b border-gray-100 bg-gray-50 px-4 py-1.5">
          {(['FAILED', 'CANCELED'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => {
                setTab(status)
                setSelected(new Set())
              }}
              className={`rounded-md px-3 py-1 text-xs font-medium ${
                tab === status
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {status === 'FAILED' ? '실패 (재시도 소진)' : '취소 (재개 불가)'}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {isLoading && <p className="p-6 text-center text-sm text-gray-500">불러오는 중…</p>}
          {isError && <p className="p-6 text-center text-sm text-red-600">목록을 불러오지 못했습니다.</p>}
          {!isLoading && !isError && rows.length === 0 && (
            <p className="p-10 text-center text-sm text-gray-500">
              {tab === 'FAILED' ? '실패한 큐가 없습니다.' : '취소된 큐가 없습니다.'}
            </p>
          )}
          {!isLoading && !isError && rows.length > 0 && (
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 bg-gray-50 text-gray-500">
                <tr className="border-b">
                  <th className="w-8 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="전체 선택"
                    />
                  </th>
                  <th className="px-3 py-2 text-left font-medium">대상 ID</th>
                  <th className="px-3 py-2 text-left font-medium">차수</th>
                  <th className="px-3 py-2 text-left font-medium">예정 시각</th>
                  <th className="px-3 py-2 text-left font-medium">종류</th>
                  <th className="px-3 py-2 text-left font-medium">시도</th>
                  <th className="px-3 py-2 text-left font-medium">마지막 오류</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(row.id)}
                        onChange={() => toggleOne(row.id)}
                        aria-label={`행 ${row.id} 선택`}
                      />
                    </td>
                    <td className="px-3 py-2 tabular-nums text-gray-900">{row.targetId}</td>
                    <td className="px-3 py-2 font-medium text-gray-700">{row.templateCode}</td>
                    <td className="px-3 py-2 tabular-nums text-gray-700">
                      {row.scheduledAt.replace('T', ' ').slice(0, 16)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          row.kind === 'AD' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {row.kind === 'AD' ? '광고톡' : '알림톡'}
                      </span>
                    </td>
                    <td className="px-3 py-2 tabular-nums text-gray-700">{row.attemptCount}</td>
                    <td className="max-w-[280px] truncate px-3 py-2 text-gray-500" title={row.lastError ?? ''}>
                      {row.lastError || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50 px-4 py-2.5">
          <span className="text-[11px] text-gray-500">
            총 {rows.length}건 · 선택 {selected.size}건
          </span>
          <Button
            size="sm"
            onClick={doRetry}
            disabled={selected.size === 0 || retryMutation.isPending}
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            {retryMutation.isPending ? '재실행 중…' : `선택 재실행 (${selected.size})`}
          </Button>
        </div>
      </div>
    </div>
  )
}
