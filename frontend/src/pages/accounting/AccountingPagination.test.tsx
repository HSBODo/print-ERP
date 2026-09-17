// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { useState } from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AccountingPagination } from './AccountingPagination'

afterEach(cleanup)

function PaginationHarness({ totalRows = 925, initialPage = 1 }: { totalRows?: number; initialPage?: number }) {
  const [page, setPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(50)
  return <AccountingPagination totalRows={totalRows} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
}

const pageButtons = () => within(screen.getByRole('navigation')).getAllByRole('button', { name: /^\d+페이지$/ })

describe('회계 페이지 이동', () => {
  it('19페이지를 한 줄에 모두 나열하지 않고 첫 페이지와 마지막 페이지를 표시한다', () => {
    render(<PaginationHarness />)
    expect(pageButtons().map((button) => button.textContent)).toEqual(['1', '2', '3', '4', '5', '19'])
    expect(screen.getByText('…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '이전' })).toBeDisabled()
    expect(screen.getByText('925건 중 1-50')).toBeInTheDocument()
  })

  it('중간 페이지에서는 앞뒤 페이지를 표시하고 다음으로 이동한다', () => {
    render(<PaginationHarness initialPage={10} />)
    expect(pageButtons().map((button) => button.textContent)).toEqual(['1', '9', '10', '11', '19'])
    expect(screen.getByRole('button', { name: '10페이지' })).toHaveAttribute('aria-current', 'page')
    fireEvent.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByRole('button', { name: '11페이지' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('925건 중 501-550')).toBeInTheDocument()
  })

  it('마지막 페이지와 처음 페이지로 바로 이동하며 양끝 버튼을 비활성화한다', () => {
    render(<PaginationHarness />)
    fireEvent.click(screen.getByRole('button', { name: '19페이지' }))
    expect(pageButtons().map((button) => button.textContent)).toEqual(['1', '15', '16', '17', '18', '19'])
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled()
    expect(screen.getByText('925건 중 901-925')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '1페이지' }))
    expect(screen.getByRole('button', { name: '이전' })).toBeDisabled()
  })

  it('행 수를 변경하면 첫 페이지로 돌아가고 페이지 수와 범위를 갱신한다', () => {
    render(<PaginationHarness initialPage={19} />)
    fireEvent.change(screen.getByRole('combobox', { name: '행 수' }), { target: { value: '500' } })
    expect(pageButtons().map((button) => button.textContent)).toEqual(['1', '2'])
    expect(screen.getByRole('button', { name: '1페이지' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('925건 중 1-500')).toBeInTheDocument()
  })

  it('빈 결과는 0-0을 표시하고 이동을 비활성화한다', () => {
    render(<PaginationHarness totalRows={0} initialPage={19} />)
    expect(screen.getByText('0건 중 0-0')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '이전' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled()
  })

  it('페이지가 수천 개여도 번호와 말줄임표는 최대 7칸이다', () => {
    render(<PaginationHarness totalRows={500_000} initialPage={5_000} />)
    expect(pageButtons()).toHaveLength(5)
    expect(screen.getAllByText('…')).toHaveLength(2)
    expect(screen.getByRole('button', { name: '10000페이지' })).toBeInTheDocument()
  })
})
