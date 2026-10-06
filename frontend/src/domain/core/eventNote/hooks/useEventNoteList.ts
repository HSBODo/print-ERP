import { useState } from 'react'

import { useFilter } from '#shared/hooks/useFilter'
import type { PaginationState } from '#shared/hooks/usePagination'
import { type DateRange, thisMonthRange } from '#shared/utils/date'

import { useEventNotes } from './useEventNotes'

/** 서버 최대 100행. */
export const EVENT_NOTE_PAGE_SIZES = [10, 20, 50, 100] as const
const DEFAULT_PAGE_SIZE = 20

export interface EventNoteFilterValues {
  period: 'all' | 'range'
  range: DateRange
}

const defaultFilter = (): EventNoteFilterValues => ({
  period: 'all',
  range: thisMonthRange(),
})

/**
 * 관리 화면 목록 상태 — 조회 조건([조회] 때 반영) · 서버 페이징 · 조회.
 * 서버 페이지 응답(0부터)을 공용 TablePagination 이 쓰는 PaginationState(1부터)로 바꿔 준다.
 */
export function useEventNoteList() {
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(DEFAULT_PAGE_SIZE)
  const filter = useFilter({
    defaults: defaultFilter,
    onSearch: () => setPage(0),
    onReset: () => {
      setPage(0)
      setSize(DEFAULT_PAGE_SIZE)
    },
  })

  const { period, range } = filter.applied
  const query = useEventNotes({
    ...(period === 'range' ? range : {}),
    page,
    size,
  })

  const rowCount = query.data?.content.length ?? 0
  const total = query.data?.totalElements ?? 0
  const pageMax = Math.max(1, query.data?.totalPages ?? 1)
  const pagination: PaginationState = {
    page: page + 1,
    pageMax,
    pageSize: size,
    total,
    rangeStart: total === 0 ? 0 : page * size + 1,
    rangeEnd: page * size + rowCount,
    setPage: (next) => setPage(Math.min(Math.max(1, next), pageMax) - 1),
    setPageSize: (next) => {
      setSize(next)
      setPage(0)
    },
    resetPage: () => setPage(0),
  }

  // 마지막 페이지의 마지막 행을 지우면 빈 페이지가 남으니 한 칸 앞으로.
  const onDeleted = () => {
    if (rowCount === 1 && page > 0) setPage(page - 1)
  }

  return { filter, query, pagination, onDeleted }
}
