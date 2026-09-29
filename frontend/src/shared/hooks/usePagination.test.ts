// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { usePagination } from '#shared/hooks/usePagination'

const rowsOf = (length: number) => Array.from({ length }, (_, index) => index)

describe('usePagination', () => {
  it('기본 50행씩 자르고 범위를 계산한다', () => {
    const { result } = renderHook(() => usePagination(rowsOf(120)))
    expect(result.current.pageRows).toHaveLength(50)
    expect(result.current).toMatchObject({ page: 1, pageMax: 3, pageSize: 50, total: 120, rangeStart: 1, rangeEnd: 50 })

    act(() => result.current.setPage(3))
    expect(result.current.pageRows).toEqual(rowsOf(120).slice(100))
    expect(result.current).toMatchObject({ page: 3, rangeStart: 101, rangeEnd: 120 })
  })

  it('initialPageSize 로 처음 행 수를 바꾼다', () => {
    const { result } = renderHook(() => usePagination(rowsOf(120), { initialPageSize: 25 }))
    expect(result.current).toMatchObject({ pageSize: 25, pageMax: 5 })
  })

  it('범위를 벗어난 페이지는 1 ~ pageMax 로 보정한다', () => {
    const { result } = renderHook(() => usePagination(rowsOf(120)))
    act(() => result.current.setPage(99))
    expect(result.current.page).toBe(3)
    act(() => result.current.setPage(0))
    expect(result.current.page).toBe(1)
  })

  it('행이 줄어 현재 페이지가 없어지면 마지막 페이지를 보여준다', () => {
    const { result, rerender } = renderHook(({ rows }) => usePagination(rows), { initialProps: { rows: rowsOf(120) } })
    act(() => result.current.setPage(3))
    rerender({ rows: rowsOf(60) })
    expect(result.current).toMatchObject({ page: 2, rangeStart: 51, rangeEnd: 60 })
  })

  it('행 수를 바꾸면 1페이지로 돌아간다', () => {
    const { result } = renderHook(() => usePagination(rowsOf(500)))
    act(() => result.current.setPage(4))
    act(() => result.current.setPageSize(100))
    expect(result.current).toMatchObject({ page: 1, pageSize: 100, pageMax: 5 })
  })

  it('resetPage 는 1페이지로 돌리고 onPageChange 는 부르지 않는다', () => {
    const onPageChange = vi.fn()
    const { result } = renderHook(() => usePagination(rowsOf(500), { onPageChange }))
    act(() => result.current.setPage(4))
    act(() => result.current.setPageSize(100))
    expect(onPageChange).toHaveBeenCalledTimes(2)

    act(() => result.current.setPage(3))
    act(() => result.current.resetPage())
    expect(result.current.page).toBe(1)
    expect(onPageChange).toHaveBeenCalledTimes(3)
  })

  it('빈 결과는 1페이지 · 0-0 이다', () => {
    const { result } = renderHook(() => usePagination([]))
    expect(result.current).toMatchObject({ page: 1, pageMax: 1, total: 0, rangeStart: 0, rangeEnd: 0 })
  })
})
