import type { Meta, StoryObj } from '@storybook/react-vite'
import { useMemo } from 'react'

import { usePagination } from '#shared/hooks/usePagination'
import { Card, CardContent } from '#shared/ui/Card'
import { TablePagination } from '#shared/ui/TablePagination'

interface DemoProps {
  total: number
  unit?: string
  pageSizeOptions?: number[]
  initialPageSize?: number
}

/** 실제 목록 화면처럼 표 아래에 붙여, 페이지를 넘기면 행이 바뀌는 것까지 본다. */
function PaginatedTableDemo({ total, unit, pageSizeOptions, initialPageSize }: DemoProps) {
  const rows = useMemo(() => Array.from({ length: total }, (_, index) => index + 1), [total])
  const pagination = usePagination(rows, { initialPageSize })

  return (
    <Card className="border-border/70 py-0 shadow-sm">
      <CardContent className="px-0">
        <div className="max-h-72 overflow-auto border-b border-border/60">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="bg-gray-50 text-gray-700">
                <th className="sticky top-0 w-16 bg-gray-50 px-2.5 py-1.5 text-right font-semibold">순번</th>
                <th className="sticky top-0 bg-gray-50 px-2.5 py-1.5 text-left font-semibold">고객명</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pageRows.map((no) => (
                <tr key={no} className="border-b border-border/40">
                  <td className="px-2.5 py-1 text-right tabular-nums">{no}</td>
                  <td className="px-2.5 py-1">고객 {no}</td>
                </tr>
              ))}
              {total === 0 && (
                <tr><td colSpan={2} className="px-3 py-12 text-center text-sm text-muted-foreground">조회 결과가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination pagination={pagination} unit={unit} pageSizeOptions={pageSizeOptions} className="rounded-b-lg" />
      </CardContent>
    </Card>
  )
}

const meta = {
  title: 'shared/TablePagination',
  component: PaginatedTableDemo,
  parameters: { layout: 'padded' },
  args: { total: 925 },
  argTypes: {
    total: { control: { type: 'number', min: 0, step: 1 } },
    initialPageSize: { control: { type: 'select' }, options: [25, 50, 100, 200] },
  },
} satisfies Meta<typeof PaginatedTableDemo>

export default meta
type Story = StoryObj<typeof meta>

export const 기본: Story = {}

export const 한_페이지: Story = { args: { total: 12 } }

export const 빈_결과: Story = { args: { total: 0 } }

export const 초기_25행: Story = {
  name: '초기 25행 (계정 관리 · 예약자 리스트_홈페이지)',
  args: { total: 180, initialPageSize: 25 },
}

export const 회계_행수: Story = {
  name: '회계 행 수 (50·100·200·500)',
  args: { total: 3_210, pageSizeOptions: [50, 100, 200, 500] },
}

export const 단위_명: Story = {
  name: '단위 명 (문자 발송 리스트)',
  args: { total: 342, unit: '명' },
}

export const 대량: Story = { args: { total: 500_000 } }
