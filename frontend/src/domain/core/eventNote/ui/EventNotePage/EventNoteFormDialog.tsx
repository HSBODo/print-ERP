import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'

import { Button } from '#shared/ui/Button'

import { useCreateEventNote } from '../../hooks/useCreateEventNote'
import { useUpdateEventNote } from '../../hooks/useUpdateEventNote'
import type { EventNote } from '../../type/api'
import {
  type EventNoteForm,
  eventNoteFormSchema,
  toFormValues,
  toRequest,
} from './eventNoteForm'

interface Props {
  /** 없으면 등록, 있으면 수정 */
  note?: EventNote
  onClose: () => void
}

const INPUT_CLASS =
  'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-red-500 text-xs mt-1">{message}</p>
}

export function EventNoteFormDialog({ note, onClose }: Props) {
  const createMutation = useCreateEventNote()
  const updateMutation = useUpdateEventNote()
  const isPending = createMutation.isPending || updateMutation.isPending

  const { register, handleSubmit, control, formState } = useForm<EventNoteForm>(
    {
      resolver: zodResolver(eventNoteFormSchema),
      defaultValues: toFormValues(note),
    },
  )
  const { errors } = formState
  const isPeriod = useWatch({ control, name: 'isPeriod' })
  const submitLabel = note ? '저장' : '등록'

  const onSubmit = async (values: EventNoteForm) => {
    const payload = toRequest(values)
    try {
      if (note) {
        await updateMutation.mutateAsync({ id: note.id, payload })
        toast.success('이벤트 노트를 수정했습니다')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('이벤트 노트를 등록했습니다')
      }
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '저장 실패')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {note ? '이벤트 노트 수정' : '이벤트 노트 등록'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="p-5 space-y-4 text-sm"
        >
          <div>
            <label
              htmlFor="event-note-date"
              className="block text-gray-700 font-medium mb-1"
            >
              발생일
            </label>
            <input
              id="event-note-date"
              type="date"
              {...register('eventDate')}
              className={INPUT_CLASS}
            />
            <FieldError message={errors.eventDate?.message} />
          </div>

          <div>
            <label
              htmlFor="event-note-summary"
              className="block text-gray-700 font-medium mb-1"
            >
              요약
            </label>
            <input
              id="event-note-summary"
              type="text"
              autoComplete="off"
              {...register('summary')}
              className={INPUT_CLASS}
              placeholder="예: 추석 프로모션 시작"
            />
            <FieldError message={errors.summary?.message} />
          </div>

          <div>
            <label
              htmlFor="event-note-description"
              className="block text-gray-700 font-medium mb-1"
            >
              설명
            </label>
            <textarea
              id="event-note-description"
              rows={3}
              {...register('description')}
              className={`${INPUT_CLASS} resize-y`}
            />
          </div>

          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 text-gray-700 font-medium">
              <input
                type="checkbox"
                {...register('isPeriod')}
                className="h-4 w-4"
              />
              기간형 이벤트
              <span className="text-xs text-gray-400 font-normal">
                (차트에 구간으로 표시)
              </span>
            </label>
            {isPeriod && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="event-note-start"
                    className="block text-gray-700 font-medium mb-1"
                  >
                    시작일
                  </label>
                  <input
                    id="event-note-start"
                    type="date"
                    {...register('startDate')}
                    className={INPUT_CLASS}
                  />
                  <FieldError message={errors.startDate?.message} />
                </div>
                <div>
                  <label
                    htmlFor="event-note-end"
                    className="block text-gray-700 font-medium mb-1"
                  >
                    종료일
                  </label>
                  <input
                    id="event-note-end"
                    type="date"
                    {...register('endDate')}
                    className={INPUT_CLASS}
                  />
                  <FieldError message={errors.endDate?.message} />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '저장 중…' : submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
