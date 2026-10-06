// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { DateRange as Range } from '#shared/utils/date'

import { DateRange } from './DateRange'

function Harness({
  onChange,
  initial = { from: '2026-08-01', to: '2026-08-31' },
  max,
}: {
  onChange?: (range: Range) => void
  initial?: Range
  max?: string
}) {
  const [range, setRange] = useState(initial)
  return (
    <DateRange
      value={range}
      maxDays={366}
      max={max}
      onChange={(next) => {
        setRange(next)
        onChange?.(next)
      }}
    />
  )
}

const openPanel = () =>
  fireEvent.click(screen.getByRole('button', { name: /2026-08-01/ }))
const panel = () => screen.getByRole('dialog', { name: '조회 기간 선택' })
const day = (value: string) => {
  const match = [...panel().querySelectorAll('button')].find(
    (node) => node.textContent === value && node.className.includes('h-8.5'),
  )
  if (!match) throw new Error(`day cell ${value} not found`)
  return match
}

afterEach(cleanup)

describe('Filter.DateRange', () => {
  it('트리거에 현재 범위를 보여주고 클릭하면 해당 월이 열린다', () => {
    render(<Harness />)
    openPanel()
    expect(panel().textContent).toContain('2026년 8월')
  })

  it('시작일 → 종료일 순으로 고르고 [적용] 해야 값이 반영된다', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    openPanel()

    fireEvent.click(day('5'))
    // 종료일 미선택 상태에서는 [적용] 이 잠긴다.
    expect(screen.getByRole('button', { name: '적용' })).toBeDisabled()
    expect(onChange).not.toHaveBeenCalled()

    fireEvent.click(day('12'))
    fireEvent.click(screen.getByRole('button', { name: '적용' }))
    expect(onChange).toHaveBeenCalledWith({
      from: '2026-08-05',
      to: '2026-08-12',
    })
  })

  it('시작일보다 이전 날짜를 누르면 시작일을 다시 잡는다', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    openPanel()

    fireEvent.click(day('20'))
    fireEvent.click(day('3'))
    fireEvent.click(day('7'))
    fireEvent.click(screen.getByRole('button', { name: '적용' }))
    expect(onChange).toHaveBeenCalledWith({
      from: '2026-08-03',
      to: '2026-08-07',
    })
  })

  it('[취소] 는 선택을 버리고 닫는다', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    openPanel()

    fireEvent.click(day('5'))
    fireEvent.click(day('9'))
    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog', { name: '조회 기간 선택' })).toBeNull()
  })

  it('Esc 로 닫히고, 다시 열면 직전에 적용된 범위로 돌아온다', () => {
    render(<Harness />)
    openPanel()
    fireEvent.click(day('5'))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: '조회 기간 선택' })).toBeNull()

    openPanel()
    expect(panel().textContent).toContain('2026-08-01')
    expect(panel().textContent).toContain('2026-08-31')
  })

  it('빠른 선택 칩이 범위와 일수를 채운다', () => {
    render(<Harness />)
    openPanel()
    fireEvent.click(screen.getByRole('button', { name: '오늘' }))
    expect(panel().textContent).toContain('1일간')
  })

  it('프리셋도 max 안으로 잘린다', () => {
    const today = new Date()
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    render(<Harness max={todayIso} />)
    openPanel()
    fireEvent.click(screen.getByRole('button', { name: '이번 달' }))
    expect(panel().textContent).toContain(`~${todayIso}`)
  })

  it('월 이동 버튼이 표시 월을 바꾼다', () => {
    render(<Harness />)
    openPanel()
    fireEvent.click(screen.getByRole('button', { name: '다음 달' }))
    expect(panel().textContent).toContain('2026년 9월')
    fireEvent.click(screen.getByRole('button', { name: '이전 달' }))
    expect(panel().textContent).toContain('2026년 8월')
  })

  it('최대 기간(maxDays)을 넘기면 [적용] 이 잠기고 안내가 뜬다', () => {
    render(<Harness initial={{ from: '2024-01-01', to: '2026-08-31' }} />)
    fireEvent.click(screen.getByRole('button', { name: /2024-01-01/ }))
    expect(screen.getByText(/최대 366일까지 조회할 수 있습니다/)).toBeTruthy()
    expect(screen.getByRole('button', { name: '적용' })).toBeDisabled()
  })
})
