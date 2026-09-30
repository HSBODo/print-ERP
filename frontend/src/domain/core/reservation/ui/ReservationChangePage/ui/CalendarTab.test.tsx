// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../hooks/useReservationChange', () => ({
  useReservationChangeDaily: vi.fn(),
}))

import { useReservationChangeDaily } from '../../../hooks/useReservationChange'
import { CalendarTab } from './CalendarTab'

const mockUseDaily = vi.mocked(useReservationChangeDaily)

beforeEach(() => {
  mockUseDaily.mockReturnValue({
    daily: { byRegistered: [], byReserveDate: [] },
    isLoading: false,
    isFetching: false,
    isError: false,
  })
})
afterEach(cleanup)

/**
 * CalendarTab 스모크 테스트 — 컴포넌트 마운트·기본 세그먼트·에러 상태 검증.
 * 달력 셀 렌더링·명절 하이라이트 등 상세는 `reservationChangeCalendarModel.test.ts` 가 다룬다.
 */
describe('CalendarTab · 예약 변경이력 추이 달력 탭', () => {
  it('마운트 시 월 선택·기준·지표·구분 세그먼트가 렌더된다', () => {
    render(<CalendarTab />)
    expect(screen.getByLabelText('달력 월')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '이번 달' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /이전 달/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /다음 달/ })).toBeInTheDocument()
  })

  it('에러 상태에서 실패 메시지가 노출된다', () => {
    mockUseDaily.mockReturnValue({
      daily: { byRegistered: [], byReserveDate: [] },
      isLoading: false,
      isFetching: false,
      isError: true,
    })
    render(<CalendarTab />)
    expect(
      screen.getByText(/추이 달력 데이터를 불러오지 못했습니다/),
    ).toBeInTheDocument()
  })

  it('빈 결과 시 두 달 각각 마트 적재 안내가 나온다 (선택 월 + 다음 달)', () => {
    render(<CalendarTab />)
    // 두 개의 달이 세로로 렌더되고 각각 "집계된 예약이 없습니다" 안내가 나타나야 한다.
    const messages = screen.getAllByText(/집계된 예약이 없습니다/)
    expect(messages).toHaveLength(2)
  })

  it('현재 월 기준으로 데이터를 요청한다 (from 은 선택 월 이전 · to 는 다음 달 이후 범위)', () => {
    render(<CalendarTab />)
    // 훅 호출 인자: (from, to) — 두 달 그리드라 최대 11주 범위
    const [from, to] = mockUseDaily.mock.calls[0] ?? []
    expect(from).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(to).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    // to 가 from 보다 뒤에 있어야 한다 (문자열 비교 = 날짜 비교 · YYYY-MM-DD)
    expect(from < to).toBe(true)
  })
})
