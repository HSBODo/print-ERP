import { api } from '#shared/api/client'

import {
  type EventNote,
  eventNoteListResponseSchema,
  type EventNotePage,
  type EventNotePageParams,
  eventNotePageResponseSchema,
  type EventNoteRequest,
  eventNoteResponseSchema,
} from './type/api'

const BASE = '/event/notes'

export const eventNoteApi = {
  /** 관리 화면 — 발생일 내림차순 페이징. */
  list: async (
    params: EventNotePageParams,
    signal?: AbortSignal,
  ): Promise<EventNotePage> => {
    const { data } = await api.get<unknown>(BASE, { params, signal })
    return eventNotePageResponseSchema.parse(data).data
  },
  /** 차트 오버레이 — 기간 안 전부, 발생일 오름차순. 최대 1,096일. */
  listAll: async (
    from: string,
    to: string,
    signal?: AbortSignal,
  ): Promise<EventNote[]> => {
    const { data } = await api.get<unknown>(`${BASE}/all`, {
      params: { from, to },
      signal,
    })
    return eventNoteListResponseSchema.parse(data).data
  },
  get: async (id: number, signal?: AbortSignal): Promise<EventNote> => {
    const { data } = await api.get<unknown>(`${BASE}/${id}`, { signal })
    return eventNoteResponseSchema.parse(data).data
  },
  create: async (payload: EventNoteRequest): Promise<EventNote> => {
    const { data } = await api.post<unknown>(BASE, payload)
    return eventNoteResponseSchema.parse(data).data
  },
  update: async (id: number, payload: EventNoteRequest): Promise<EventNote> => {
    const { data } = await api.put<unknown>(`${BASE}/${id}`, payload)
    return eventNoteResponseSchema.parse(data).data
  },
  /** 소프트 삭제 — 성공 응답은 { success: true } 뿐이라 파싱하지 않는다. */
  remove: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/${id}`)
  },
}
