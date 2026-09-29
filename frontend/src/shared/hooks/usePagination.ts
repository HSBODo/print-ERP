import { useMemo, useState } from 'react'
import { hashKey } from '@tanstack/react-query'

export const DEFAULT_PAGE_SIZE = 50
export const DEFAULT_PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const

interface PaginationOptions {
  /** 처음 보여줄 행 수 */
  initialPageSize?: number
  /**
   * 목록을 식별하는 키 — 바뀌면 1페이지로 돌아간다 (조회 값·필터·정렬 등).
   * TanStack Query 의 queryKey 처럼 내용으로 비교하므로 매 렌더 새 배열·객체를 넘겨도 값이 같으면 유지된다.
   */
  resetKey?: readonly unknown[]
  /** 사용자가 페이지나 행 수를 바꿨을 때 (resetKey 로 1페이지가 될 때는 부르지 않는다) — 예: 선택 해제 */
  onPageChange?: () => void
}

export interface PaginationState {
  /** 1 ~ pageMax 로 보정된 현재 페이지 */
  page: number
  pageMax: number
  pageSize: number
  total: number
  /** 현재 페이지 첫 행의 순번 (1부터, 빈 결과면 0) */
  rangeStart: number
  rangeEnd: number
  setPage: (page: number) => void
  /** 행 수를 바꾸면 1페이지로 돌아간다 */
  setPageSize: (pageSize: number) => void
}

/** usePagination 결과 — 현재 페이지 행까지 하위 컴포넌트에 통째로 넘길 때 쓴다. */
export type Pagination<T> = PaginationState & { pageRows: T[] }

/** 받아온 행 전체를 화면에서 잘라 보여주는 페이지네이션. */
export function usePagination<T>(
  rows: readonly T[],
  { initialPageSize = DEFAULT_PAGE_SIZE, resetKey = [], onPageChange }: PaginationOptions = {},
): Pagination<T> {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = useState(initialPageSize)
  // 이전 키와 비교할 때 배열·객체를 일일이 비교하지 않도록 문자열 하나로 해시해 둔다 (queryKey 와 같은 방식).
  // 렌더마다 계산하니 필터·정렬 같은 작은 값만 넣는다.
  const resetHash = hashKey(resetKey)
  const [prevResetHash, setPrevResetHash] = useState(resetHash)

  if (prevResetHash !== resetHash) {
    setPrevResetHash(resetHash)
    setPage(1)
  }

  const total = rows.length
  const pageMax = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, pageMax)
  const start = (safePage - 1) * pageSize
  const pageRows = useMemo(() => rows.slice(start, start + pageSize), [rows, start, pageSize])

  return {
    page: safePage,
    pageMax,
    pageSize,
    total,
    rangeStart: total === 0 ? 0 : start + 1,
    rangeEnd: Math.min(start + pageSize, total),
    pageRows,
    setPage: (next) => {
      setPage(Math.min(Math.max(1, next), pageMax))
      onPageChange?.()
    },
    setPageSize: (size) => {
      setPageSizeState(size)
      setPage(1)
      onPageChange?.()
    },
  }
}
