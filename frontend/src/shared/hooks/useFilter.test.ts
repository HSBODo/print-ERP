// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vitest'

import { useFilter } from '#shared/hooks/useFilter'

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

const defaults = () => ({ month: '2026-09', status: '' })

describe('useFilter', () => {
  it('입력값은 [조회] 전까지 적용값에 반영되지 않는다', () => {
    const { result } = renderHook(() => useFilter({ defaults }))
    act(() => result.current.field('month').onChange('2026-08'))
    expect(result.current.draft.month).toBe('2026-08')
    expect(result.current.applied.month).toBe('2026-09')

    act(() => {
      expect(result.current.search()).toBe('applied')
    })
    expect(result.current.applied.month).toBe('2026-08')
  })

  it('setDraft 는 여러 값을 한 번에 고친다', () => {
    const { result } = renderHook(() => useFilter({ defaults }))
    act(() => result.current.setDraft({ month: '2026-07', status: '완료' }))
    expect(result.current.draft).toEqual({ month: '2026-07', status: '완료' })
  })

  it('조건이 그대로면 unchanged — 그래도 onSearch 는 부른다', () => {
    const onSearch = vi.fn()
    const { result } = renderHook(() => useFilter({ defaults, onSearch }))
    act(() => {
      expect(result.current.search()).toBe('unchanged')
    })
    expect(onSearch).toHaveBeenCalledTimes(1)
  })

  it('검증에 실패하면 토스트를 띄우고 적용하지 않는다', () => {
    const onSearch = vi.fn()
    const { result } = renderHook(() =>
      useFilter({ defaults, onSearch, validate: () => '기간 오류' }),
    )
    act(() => result.current.field('month').onChange('2026-01'))
    act(() => {
      expect(result.current.search()).toBe('invalid')
    })
    expect(result.current.applied.month).toBe('2026-09')
    expect(onSearch).not.toHaveBeenCalled()
    expect(toast.error).toHaveBeenCalledWith('조회 조건을 확인해 주세요', {
      description: '기간 오류',
    })
  })

  it('초기화는 입력값·적용값을 기본값으로 되돌리고 onReset 을 부른다', () => {
    const onReset = vi.fn()
    const { result } = renderHook(() => useFilter({ defaults, onReset }))
    act(() => result.current.field('month').onChange('2026-01'))
    act(() => {
      result.current.search()
    })
    act(() => result.current.reset())
    expect(result.current.draft.month).toBe('2026-09')
    expect(result.current.applied.month).toBe('2026-09')
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})
