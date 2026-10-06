import { z } from 'zod'

import { apiResponseOf } from '#shared/api/utils'

const eventNoteSchema = z.object({
  id: z.number(),
  /** 발생일 (YYYY-MM-DD) — 조회 기간 필터와 정렬 기준. */
  eventDate: z.string(),
  summary: z.string(),
  description: z.string().nullable(),
  /** 기간형 이벤트의 차트 구간 표시용 — 조회 조건이 아니다. startDate ≤ eventDate ≤ endDate. */
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedBy: z.string(),
  updatedAt: z.string(),
})
export type EventNote = z.infer<typeof eventNoteSchema>

const eventNotePageSchema = z.object({
  content: z.array(eventNoteSchema),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
  totalPages: z.number(),
})
export type EventNotePage = z.infer<typeof eventNotePageSchema>

export const eventNotePageResponseSchema = apiResponseOf(eventNotePageSchema)
export const eventNoteListResponseSchema = apiResponseOf(
  z.array(eventNoteSchema),
)
export const eventNoteResponseSchema = apiResponseOf(eventNoteSchema)

/** 관리 화면 페이징 조회. from·to 는 둘 다 주거나 둘 다 생략(= 전체 기간). */
export interface EventNotePageParams {
  from?: string
  to?: string
  /** 0부터, 기본 0 */
  page?: number
  /** 1~100, 기본 20 */
  size?: number
}

/** 등록·수정(전체 교체) 요청. 작성자·수정자·일시는 서버가 채운다. */
export interface EventNoteRequest {
  eventDate: string
  summary: string
  description: string | null
  startDate: string | null
  endDate: string | null
}
