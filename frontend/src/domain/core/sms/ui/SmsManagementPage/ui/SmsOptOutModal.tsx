import { useState } from 'react'
import { AlertTriangle, RefreshCw, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#shared/ui/Button'
import {
  useReleaseSmsOptOut,
  useSmsOptOuts,
} from '../../../hooks/useSmsManagement'
import type { SmsOptOutRow } from '../../../type/api'

/**
 * 수신거부 관리 모달 — 목록 조회 + 해제.
 *
 * <b>정책 안내 (관리자용)</b>
 *   · 해제 = sms_opt_out 에서 물리 삭제 (되돌릴 수 없음).
 *   · 홀딩은 자동으로 풀지 않는다 — 해제만 하고 sms_target 상태는 HOLD 그대로.
 *     지난 차수가 한꺼번에 나가는 사고를 방지하기 위해 두 액션을 분리.
 *
 * <b>UX</b>
 *   · 목록: 이름 / 차트번호 / 마스킹 번호 / 등록 경로 / 등록 시각 · 처리자
 *   · 해제 버튼 → confirm 다이얼로그 → mutation → 성공 시 목록 재조회
 */
export function SmsOptOutModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { data, isLoading, isError, refetch, isFetching } = useSmsOptOuts(open)
  const releaseMutation = useReleaseSmsOptOut()

  const [confirmTarget, setConfirmTarget] = useState<SmsOptOutRow | null>(null)

  if (!open) return null

  const doRelease = (row: SmsOptOutRow) => {
    releaseMutation.mutate(row.id, {
      onSuccess: (removed) => {
        setConfirmTarget(null)
        if (removed) {
          toast.success(
            `${row.name || row.phoneMasked} 수신거부 해제됨. 홀딩은 자동으로 풀리지 않음 — 필요 시 대상 리스트에서 개별 해제.`,
          )
        } else {
          toast.info('이미 삭제된 항목입니다.')
        }
      },
      onError: (err) => toast.error(`해제 실패: ${(err as Error).message}`),
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="수신거부 관리"
    >
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              수신거부 관리
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              사람 단위 발송 차단 목록. 해제해도 홀딩된 대상은 자동으로 풀리지
              않습니다.
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw
                className={`mr-1 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`}
              />
              새로고침
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {isLoading && (
            <p className="p-6 text-center text-sm text-gray-500">
              불러오는 중…
            </p>
          )}
          {isError && (
            <p className="p-6 text-center text-sm text-red-600">
              목록을 불러오지 못했습니다.
            </p>
          )}
          {!isLoading && !isError && data && data.length === 0 && (
            <p className="p-10 text-center text-sm text-gray-500">
              등록된 수신거부가 없습니다.
            </p>
          )}
          {!isLoading && !isError && data && data.length > 0 && (
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 bg-gray-50 text-gray-500">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium">이름</th>
                  <th className="px-3 py-2 text-left font-medium">차트</th>
                  <th className="px-3 py-2 text-left font-medium">연락처</th>
                  <th className="px-3 py-2 text-left font-medium">경로</th>
                  <th className="px-3 py-2 text-left font-medium">등록</th>
                  <th className="px-3 py-2 text-right font-medium">해제</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {row.name || '-'}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-gray-700">
                      {row.chartNo || '-'}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-gray-700">
                      {row.phoneMasked}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                        {row.source}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">
                      <div className="tabular-nums">
                        {row.createdAt.replace('T', ' ').slice(0, 16)}
                      </div>
                      {row.createdBy && (
                        <div className="text-[10px] text-gray-400">
                          by {row.createdBy}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setConfirmTarget(row)}
                        disabled={releaseMutation.isPending}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        해제
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="border-t border-gray-100 px-5 py-2.5 text-[11px] text-gray-500">
          총 {data?.length ?? 0}건 · 해제된 항목은 sms_opt_out 에서 물리
          삭제되어 복구할 수 없습니다.
        </div>
      </div>

      {/* 확인 다이얼로그 */}
      {confirmTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="text-sm font-semibold text-gray-900">
                수신거부 해제 확인
              </h3>
            </div>
            <div className="mb-4 space-y-2 text-sm text-gray-700">
              <p>
                <b>{confirmTarget.name || confirmTarget.phoneMasked}</b> 의
                수신거부를 해제하시겠습니까?
              </p>
              <ul className="ml-4 list-disc space-y-1 text-xs text-gray-600">
                <li>
                  sms_opt_out 에서 <b>물리 삭제</b>됩니다 (복구 불가).
                </li>
                <li>
                  다음 수술 시 새 발송 대상이 <b>SENDABLE</b> 로 등록될 수
                  있습니다.
                </li>
                <li>
                  이 번호로 기존에 홀딩된 발송 대상은{' '}
                  <b>자동으로 풀리지 않습니다</b> — 필요 시 대상 리스트에서 개별
                  해제해주세요.
                </li>
              </ul>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmTarget(null)}
              >
                취소
              </Button>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700"
                onClick={() => doRelease(confirmTarget)}
                disabled={releaseMutation.isPending}
              >
                {releaseMutation.isPending ? '해제 중…' : '해제'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
