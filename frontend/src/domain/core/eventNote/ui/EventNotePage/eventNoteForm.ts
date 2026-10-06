import { z } from 'zod'

import type { EventNote, EventNoteRequest } from '../../type/api'

/**
 * 등록·수정 폼. 기간형이면 시작일·종료일을 받고 시작일 ≤ 발생일 ≤ 종료일 을 검증한다
 * (백엔드 400 errors.periodValid 와 같은 규칙). 날짜는 YYYY-MM-DD 문자열이라 문자열 비교로 충분하다.
 */
export const eventNoteFormSchema = z
  .object({
    eventDate: z.string().min(1, '발생일을 입력하세요'),
    summary: z.string().trim().min(1, '요약을 입력하세요'),
    description: z.string(),
    isPeriod: z.boolean(),
    startDate: z.string(),
    endDate: z.string(),
  })
  .superRefine((v, ctx) => {
    if (!v.isPeriod) return
    if (!v.startDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['startDate'],
        message: '시작일을 입력하세요',
      })
    }
    if (!v.endDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: '종료일을 입력하세요',
      })
    }
    if (!v.startDate || !v.endDate || !v.eventDate) return
    if (!(v.startDate <= v.eventDate && v.eventDate <= v.endDate)) {
      ctx.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: '시작일 ≤ 발생일 ≤ 종료일 이어야 합니다',
      })
    }
  })
export type EventNoteForm = z.infer<typeof eventNoteFormSchema>

export const toFormValues = (note?: EventNote): EventNoteForm => ({
  eventDate: note?.eventDate ?? '',
  summary: note?.summary ?? '',
  description: note?.description ?? '',
  isPeriod: note?.startDate != null || note?.endDate != null,
  startDate: note?.startDate ?? '',
  endDate: note?.endDate ?? '',
})

/** 수정은 전체 교체라 빈 값은 null 로 보낸다. 기간형이 아니면 시작·종료일을 비운다. */
export const toRequest = (form: EventNoteForm): EventNoteRequest => ({
  eventDate: form.eventDate,
  summary: form.summary.trim(),
  description: form.description.trim() || null,
  startDate: form.isPeriod ? form.startDate : null,
  endDate: form.isPeriod ? form.endDate : null,
})
