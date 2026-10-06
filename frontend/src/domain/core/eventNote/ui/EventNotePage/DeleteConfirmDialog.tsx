import { AlertTriangle, X } from 'lucide-react'

import { Button } from '#shared/ui/Button'

import type { EventNote } from '../../type/api'

interface Props {
  note: EventNote
  isSubmitting: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmDialog({
  note,
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
            <h2 className="text-base font-semibold text-gray-900">
              이벤트 노트 삭제
            </h2>
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

        <p className="p-5 text-sm text-gray-700">
          <span className="font-medium text-gray-900">
            {note.eventDate} · {note.summary}
          </span>{' '}
          노트를 삭제합니다. 화면에서는 되살릴 수 없습니다.
        </p>

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
