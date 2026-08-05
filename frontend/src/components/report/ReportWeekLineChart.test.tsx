// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { weeksOfYear } from './reportWeeks'

vi.mock('recharts', () => ({
  CartesianGrid: () => null,
  Line: () => null,
  LineChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
}))

vi.mock('@/components/ui/chart', () => ({
  ChartContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}))

import { ReportWeekLineChart } from './ReportWeekLineChart'

afterEach(cleanup)

const weeks = weeksOfYear(2026)
const data = {
  2024: weeks.map(() => 1),
  2025: weeks.map(() => 2),
  2026: weeks.map(() => 3),
}

describe('ReportWeekLineChart 하단 표', () => {
  it('기본 모드는 전체 주차를 27주씩 두 표로 나눈다', () => {
    render(<ReportWeekLineChart title="일반 지표" years={[2024, 2025, 2026]} weeks={weeks} data={data} />)

    expect(screen.getAllByRole('table')).toHaveLength(2)
    expect(screen.getByText('1~27주')).toBeInTheDocument()
    expect(screen.getByText('28~53주')).toBeInTheDocument()
  })

  it('singleTable 모드는 1~53주와 연간 합계를 한 표에 표시한다', () => {
    render(
      <ReportWeekLineChart
        title="드림렌즈 신규수"
        years={[2024, 2025, 2026]}
        weeks={weeks}
        data={data}
        singleTable
      />,
    )

    const table = screen.getByRole('table')
    expect(screen.queryByText('1~27주')).not.toBeInTheDocument()
    expect(within(table).getAllByRole('columnheader')).toHaveLength(55)

    const rows = within(table).getAllByRole('row')
    expect(within(rows[1]).getAllByRole('cell').at(-1)).toHaveTextContent('53')
    expect(within(rows[2]).getAllByRole('cell').at(-1)).toHaveTextContent('106')
    expect(within(rows[3]).getAllByRole('cell').at(-1)).toHaveTextContent('159')
  })
})
