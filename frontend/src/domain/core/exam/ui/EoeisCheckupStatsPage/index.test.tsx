// @vitest-environment happy-dom

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { checkupResult } = vi.hoisted(() => {
  const operators = [
    '(검사자 미지정)',
    '[검사]',
    '[어시]',
    '[진료부]',
    ...Array.from(
      { length: 32 },
      (_, index) => `검사자 ${String(index + 1).padStart(2, '0')}`,
    ),
  ]
  return {
    checkupResult: {
      rows: operators.flatMap((operatorName, index) => [
        {
          operatorName,
          deviceName: '휴비츠 OCT',
          date: '2026-07-01',
          count: index + 1,
        },
        {
          operatorName,
          deviceName: 'AL-SCAN',
          date: '2026-07-06',
          count: index + 2,
        },
      ]),
      scores: { '휴비츠 OCT': 2, 'AL-SCAN': 1 },
    },
  }
})

vi.mock('../../hooks/useEoeisCheckup', () => ({
  useEoeisCheckup: () => ({
    data: checkupResult,
    isLoading: false,
    isFetching: false,
    isError: false,
  }),
}))

import { EoeisCheckupStatsPage } from '.'

afterEach(cleanup)

describe('EoeisCheckupStatsPage', () => {
  it('2026년 7월 1일 이전 조회를 제한하고 테이블 외곽 Card를 사용하지 않는다', () => {
    const { container } = render(<EoeisCheckupStatsPage />)

    expect(
      screen.getByRole('button', { name: '통계 조회' }),
    ).toBeInTheDocument()
    const startDate = screen.getByLabelText('조회 시작일')
    const endDate = screen.getByLabelText('조회 종료일')
    expect(startDate).toHaveAttribute('min', '2026-07-01')
    expect(endDate).toHaveAttribute('min', '2026-07-01')
    expect(
      container.querySelector('[data-slot="card"]'),
    ).not.toBeInTheDocument()

    fireEvent.change(startDate, { target: { value: '2026-06-01' } })
    fireEvent.change(endDate, { target: { value: '2026-06-30' } })
    fireEvent.click(screen.getByRole('button', { name: '통계 조회' }))
    expect(startDate).toHaveValue('2026-07-01')
    expect(endDate).toHaveValue('2026-07-01')
    expect(screen.getByLabelText('조회 단위')).toHaveValue('day')
    expect(screen.getByRole('radio', { name: '검사자 × 장비' })).toBeChecked()
    expect(screen.getByText('휴비츠 OCT')).toBeInTheDocument()
    expect(screen.getByText('검사자 01')).toBeInTheDocument()
    expect(screen.getByText('(검사자 미지정)')).toBeInTheDocument()
  })

  it('점수 설정과 기간 라디오 및 주차별 집계를 화면 상태로 전환한다', () => {
    render(<EoeisCheckupStatsPage />)

    fireEvent.click(screen.getByRole('button', { name: '장비 점수 설정' }))
    expect(screen.getByLabelText('휴비츠 OCT 점수')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '점수' }))
    fireEvent.change(screen.getByLabelText('조회 단위'), {
      target: { value: 'week' },
    })
    fireEvent.click(screen.getByRole('radio', { name: '검사자 × 기간' }))

    expect(screen.getByRole('radio', { name: '검사자 × 기간' })).toBeChecked()
    expect(screen.getByText('환산 점수')).toBeInTheDocument()
    expect(screen.getByText('07.01 ~ 07.05')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('조회 단위'), {
      target: { value: 'month' },
    })
    expect(screen.getByText('2026년 7월')).toBeInTheDocument()
  })

  it('전체 검사자 리스트 방식으로 페이지를 이동하고 컬럼을 양방향 정렬한다', () => {
    render(<EoeisCheckupStatsPage />)

    // 기본 50행이면 36명이 한 페이지라 25행으로 줄여 두 페이지를 만든다.
    fireEvent.change(screen.getByRole('combobox', { name: '행 수' }), {
      target: { value: '25' },
    })
    fireEvent.click(screen.getByRole('button', { name: '다음 페이지' }))
    expect(screen.getByText('검사자 32')).toBeInTheDocument()
    expect(screen.getByText('36명 중 26-36')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '이전 페이지' }))
    const totalSortButton = screen.getByRole('button', { name: '합계 정렬' })
    const totalHeader = totalSortButton.closest('th')
    if (!totalHeader) throw new Error('합계 정렬 헤더를 찾을 수 없습니다.')

    fireEvent.click(totalSortButton)
    expect(totalHeader).toHaveAttribute('aria-sort', 'ascending')
    fireEvent.click(totalSortButton)
    expect(totalHeader).toHaveAttribute('aria-sort', 'descending')
  })
})
