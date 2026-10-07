// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useYearCompare } from './useYearCompare'

const YEARS = [2024, 2025]

describe('useYearCompare', () => {
  it('getValue 가 새 함수여도 값이 같으면 chartData 참조를 유지한다', () => {
    const { result, rerender } = renderHook(
      ({ base }) => useYearCompare(YEARS, (year, month) => base + year + month),
      { initialProps: { base: 0 } },
    )
    const first = result.current.chartData

    rerender({ base: 0 })
    expect(result.current.chartData).toBe(first)

    rerender({ base: 1 })
    expect(result.current.chartData).not.toBe(first)
  })
})
