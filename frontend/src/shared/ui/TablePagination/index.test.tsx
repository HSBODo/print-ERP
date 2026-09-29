// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { useMemo } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { usePagination } from '#shared/hooks/usePagination'
import { TablePagination } from '#shared/ui/TablePagination'

afterEach(cleanup)

function Harness({ total = 925, unit, pageSizeOptions }: { total?: number; unit?: string; pageSizeOptions?: number[] }) {
  const rows = useMemo(() => Array.from({ length: total }, (_, index) => index), [total])
  const pagination = usePagination(rows)
  return <TablePagination pagination={pagination} unit={unit} pageSizeOptions={pageSizeOptions} />
}

const button = (name: string) => screen.getByRole('button', { name })
const pageSizeSelect = () => screen.getByRole('combobox', { name: '행 수' })

describe('표 페이지 이동', () => {
  it('첫 페이지에서는 건수 · 현재/전체 페이지를 보여주고 처음·이전 버튼을 비활성화한다', () => {
    render(<Harness />)
    expect(screen.getByText('925건 중 1-50')).toBeInTheDocument()
    expect(screen.getByText('1 / 19')).toBeInTheDocument()
    expect(button('처음 페이지')).toBeDisabled()
    expect(button('이전 페이지')).toBeDisabled()
    expect(button('다음 페이지')).toBeEnabled()
    expect(button('마지막 페이지')).toBeEnabled()
  })

  it('다음 · 이전으로 한 페이지씩 이동한다', () => {
    render(<Harness />)
    fireEvent.click(button('다음 페이지'))
    fireEvent.click(button('다음 페이지'))
    expect(screen.getByText('3 / 19')).toBeInTheDocument()
    expect(screen.getByText('925건 중 101-150')).toBeInTheDocument()
    fireEvent.click(button('이전 페이지'))
    expect(screen.getByText('2 / 19')).toBeInTheDocument()
  })

  it('마지막 · 처음 페이지로 바로 이동하며 끝에서는 해당 방향 버튼을 비활성화한다', () => {
    render(<Harness />)
    fireEvent.click(button('마지막 페이지'))
    expect(screen.getByText('19 / 19')).toBeInTheDocument()
    expect(screen.getByText('925건 중 901-925')).toBeInTheDocument()
    expect(button('다음 페이지')).toBeDisabled()
    expect(button('마지막 페이지')).toBeDisabled()
    fireEvent.click(button('처음 페이지'))
    expect(screen.getByText('1 / 19')).toBeInTheDocument()
  })

  it('행 수를 변경하면 첫 페이지로 돌아가고 페이지 수와 범위를 갱신한다', () => {
    render(<Harness pageSizeOptions={[50, 100, 200, 500]} />)
    fireEvent.click(button('마지막 페이지'))
    fireEvent.change(pageSizeSelect(), { target: { value: '500' } })
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
    expect(screen.getByText('925건 중 1-500')).toBeInTheDocument()
  })

  it('빈 결과는 0-0 · 1 / 1 을 표시하고 이동을 모두 비활성화한다', () => {
    render(<Harness total={0} />)
    expect(screen.getByText('0건 중 0-0')).toBeInTheDocument()
    expect(screen.getByText('1 / 1')).toBeInTheDocument()
    for (const name of ['처음 페이지', '이전 페이지', '다음 페이지', '마지막 페이지']) {
      expect(button(name)).toBeDisabled()
    }
  })

  it('행 수 선택지 기본값은 25·50·100·200 이고 건수 단위를 바꿀 수 있다', () => {
    render(<Harness total={120} unit="명" />)
    const options = within(pageSizeSelect()).getAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual(['25', '50', '100', '200'])
    expect(screen.getByText('120명 중 1-50')).toBeInTheDocument()
  })

  it('큰 숫자는 천 단위 구분 기호를 붙인다', () => {
    render(<Harness total={500_000} />)
    expect(screen.getByText('500,000건 중 1-50')).toBeInTheDocument()
    expect(screen.getByText('1 / 10,000')).toBeInTheDocument()
  })
})
