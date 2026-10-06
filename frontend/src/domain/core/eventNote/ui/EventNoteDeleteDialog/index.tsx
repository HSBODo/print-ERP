import { AlertTriangle, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '#shared/ui/Button'

import { useDeleteEventNote } from '../../hooks/useDeleteEventNote'
import type { EventNote } from '../../type/api'

interface Props {
  note: EventNote
  /** 삭제 성공 후 — 목록 쪽 후처리(빈 페이지면 앞으로) */
  onDeleted: () => void
  onClose: () => void
}

export function EventNoteDeleteDialog({ note, onDeleted, onClose }: Props) {
  const deleteMutation = useDeleteEventNote()
  const isSubmitting = deleteMutation.isPending

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(note.id)
      toast.success('이벤트 노트를 삭제했습니다')
      onDeleted()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '삭제 실패')
    }
  }

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
            onClick={onClose}
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
            onClick={onClose}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
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
