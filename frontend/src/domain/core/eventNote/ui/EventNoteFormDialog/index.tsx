import { zodResolver } from '@hookform/resolvers/zod'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
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
} from '../../utils/eventNoteForm'

interface Props {
  /** 없으면 등록, 있으면 수정 */
  note?: EventNote
  onClose: () => void
}

const INPUT_CLASS =
  'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none'

/** 라벨이 입력을 감싸 클릭·스크린리더 연결을 id 없이 한다. */
function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <div>
      <label className="block">
        <span className="block text-gray-700 font-medium mb-1">{label}</span>
        {children}
      </label>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
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
          <Field label="발생일" error={errors.eventDate?.message}>
            <input
              type="date"
              {...register('eventDate')}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="요약" error={errors.summary?.message}>
            <input
              type="text"
              autoComplete="off"
              {...register('summary')}
              className={INPUT_CLASS}
              placeholder="예: 추석 프로모션 시작"
            />
          </Field>
          <Field label="설명">
            <textarea
              rows={3}
              {...register('description')}
              className={`${INPUT_CLASS} resize-y`}
            />
          </Field>

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
                <Field label="시작일" error={errors.startDate?.message}>
                  <input
                    type="date"
                    {...register('startDate')}
                    className={INPUT_CLASS}
                  />
                </Field>
                <Field label="종료일" error={errors.endDate?.message}>
                  <input
                    type="date"
                    {...register('endDate')}
                    className={INPUT_CLASS}
                  />
                </Field>
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
