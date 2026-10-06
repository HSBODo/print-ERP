import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { eventNoteApi } from '../api'
import type { EventNotePageParams } from '../type/api'

/** 이벤트 노트 쿼리 공통 접두 — 등록·수정·삭제 후 이 키로 전부 무효화한다. */
export const EVENT_NOTES_KEY = ['eventNotes'] as const

/** 관리 화면 페이징 조회 — 페이지를 넘기는 동안 이전 페이지를 유지한다. */
export const useEventNotes = (params: EventNotePageParams) =>
  useQuery({
    queryKey: [...EVENT_NOTES_KEY, 'page', params],
    queryFn: ({ signal }) => eventNoteApi.list(params, signal),
    placeholderData: keepPreviousData,
  })
