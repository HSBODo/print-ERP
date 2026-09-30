// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

// 훅 mock — 실제 네트워크·TanStack Query 없이 컴포넌트 자체 렌더만 검증한다.
vi.mock('../../../hooks/useReservationChange', () => ({
  useReservationChange: vi.fn(),
}))
vi.mock('../utils/reservationChangeCsv', () => ({
  downloadReservationChangeCsv: vi.fn(),
}))

import { DetailTab } from './DetailTab'
import { useReservationChange } from '../../../hooks/useReservationChange'

const mockUseReservationChange = vi.mocked(useReservationChange)

beforeEach(() => {
  mockUseReservationChange.mockReturnValue({
    rows: [],
    isLoading: false,
    isFetching: false,
    isError: false,
  })
})
afterEach(cleanup)

/**
 * DetailTab 스모크 테스트 — 컴포넌트 마운트·기본 UI·에러 상태·훅 재호출 검증.
 * 필터·정렬·CSV 등 상세 로직은 이미 `reservationChangeModel.test.ts` 가 다룬다.
 */
describe('DetailTab · 예약 변경이력 상세 탭', () => {
  it('마운트 시 등록기간·기준일·조회 버튼이 렌더된다', () => {
    render(<DetailTab />)
    expect(screen.getByText('등록기간')).toBeInTheDocument()
    expect(screen.getByText('기준일')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /조회/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /초기화/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /CSV/ })).toBeInTheDocument()
  })

  it('로딩 상태에서 조회 버튼이 비활성화된다', () => {
    mockUseReservationChange.mockReturnValue({
      rows: [],
      isLoading: true,
      isFetching: false,
      isError: false,
    })
    render(<DetailTab />)
    expect(screen.getByRole('button', { name: /조회/ })).toBeDisabled()
  })

  it('에러 상태에서 실패 메시지가 노출된다', () => {
    mockUseReservationChange.mockReturnValue({
      rows: [],
      isLoading: false,
      isFetching: false,
      isError: true,
    })
    render(<DetailTab />)
    expect(
      screen.getByText(/예약 변경이력을 불러오지 못했습니다/),
    ).toBeInTheDocument()
  })

  it('빈 결과 시 초기화 안내 메시지가 나타난다', () => {
    render(<DetailTab />)
    // rows.length === 0 → 마트 적재 여부 확인 문구
    expect(
      screen.getByText(/조회 범위에 변경된 예약이 없습니다/),
    ).toBeInTheDocument()
  })

  it('초기화 버튼 클릭 시 훅 재호출 인자가 기본값(현재 연도)으로 돌아간다', () => {
    render(<DetailTab />)
    const currentYear = String(new Date().getFullYear())
    // 최초 마운트 호출: from=`${currentYear}-01-01`
    const firstCallFrom = mockUseReservationChange.mock.calls[0]?.[0]
    expect(firstCallFrom?.startsWith(currentYear)).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: /초기화/ }))
    // 리렌더 후 훅이 다시 호출됐고 from 이 여전히 현재 연도로 시작해야 한다.
    const lastCallFrom = mockUseReservationChange.mock.calls.at(-1)?.[0]
    expect(lastCallFrom?.startsWith(currentYear)).toBe(true)
  })
})
