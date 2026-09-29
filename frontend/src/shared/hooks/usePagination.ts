import { useMemo, useState } from 'react'

export const DEFAULT_PAGE_SIZE = 50
export const DEFAULT_PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const

interface PaginationOptions {
  /** 처음 보여줄 행 수 */
  initialPageSize?: number
  /**
   * 값이 하나라도 바뀌면 1페이지로 돌아간다 (필터·정렬 값 등).
   * 원소끼리 Object.is 로 비교하므로 매 렌더 새 배열을 넘겨도 값이 같으면 유지된다.
   */
  resetDeps?: readonly unknown[]
  /** 사용자가 페이지나 행 수를 바꿨을 때 (resetDeps 로 1페이지가 될 때는 부르지 않는다) — 예: 선택 해제 */
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

const sameDeps = (a: readonly unknown[], b: readonly unknown[]) =>
  a.length === b.length && a.every((value, index) => Object.is(value, b[index]))

/** 받아온 행 전체를 화면에서 잘라 보여주는 페이지네이션. */
export function usePagination<T>(
  rows: readonly T[],
  { initialPageSize = DEFAULT_PAGE_SIZE, resetDeps = [], onPageChange }: PaginationOptions = {},
): Pagination<T> {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = useState(initialPageSize)
  const [prevResetDeps, setPrevResetDeps] = useState(resetDeps)

  if (!sameDeps(prevResetDeps, resetDeps)) {
    setPrevResetDeps(resetDeps)
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
