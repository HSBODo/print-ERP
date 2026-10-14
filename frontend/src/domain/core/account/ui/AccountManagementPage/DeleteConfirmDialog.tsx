import { AlertTriangle, X } from 'lucide-react'

import { Button } from '#shared/ui/Button'

import type { UserRow } from '../../type/api'

interface Props {
  user: UserRow
  isSubmitting: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmDialog({
  user,
  isSubmitting,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-lg bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <h2 className="text-base font-semibold text-gray-900">계정 삭제</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 p-1 rounded"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3 text-sm text-gray-700">
          <p>
            <span className="font-mono font-medium text-gray-900">
              {user.loginId}
            </span>{' '}
            ({user.name}) 계정을 삭제합니다. 이 작업은 되돌릴 수 없습니다.
          </p>
          <p className="text-xs text-gray-500">
            연관된 이력(예: 이 계정이 만든 오프셋 편집 로그) 은 계정만 사라지고
            이력은 유지됩니다.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 bg-gray-50 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {isSubmitting ? '삭제 중…' : '삭제'}
          </Button>
        </div>
      </div>
    </div>
  )
}
