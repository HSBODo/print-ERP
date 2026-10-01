import type { ReactNode } from 'react'

import { Filter } from '#shared/ui/Filter'

export interface VisionExtraFilters {
  category: string
  acquirer: string
  status: '전체' | '결제처리' | '결제취소'
  tax: '전체' | '과세' | '면세'
  breakdown: '전체' | '진료구분' | '결제수단' | '매입사'
}

const Group = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-center gap-1.5">
    <span className="whitespace-nowrap text-[11px] text-gray-500">{label}</span>
    {children}
  </div>
)

const Divider = () => <span className="h-6 w-px bg-gray-200" />

/** 둘째 줄 — 받아온 매출 행을 바로 거르는 조건 묶음 */
export function VisionRevenueFilters({
  value,
  categories,
  acquirers,
  onChange,
}: {
  value: VisionExtraFilters
  categories: string[]
  acquirers: string[]
  onChange: (value: VisionExtraFilters) => void
}) {
  return (
    <Filter.Bar className="gap-2 border-gray-200 bg-gray-50/70 px-2.5 py-2">
      <Group label="진료구분">
        <Filter.Select
          value={value.category}
          onChange={(category) => onChange({ ...value, category })}
          options={categories}
          ariaLabel="진료구분"
          className="w-[150px]"
        />
      </Group>
      <Divider />
      <Group label="매입사">
        <Filter.Select
          value={value.acquirer}
          onChange={(acquirer) => onChange({ ...value, acquirer })}
          options={acquirers}
          ariaLabel="매입사"
          className="w-[140px]"
        />
      </Group>
      <Divider />
      <Group label="상태">
        <Filter.Segment
          value={value.status}
          onChange={(status) => onChange({ ...value, status })}
          options={['전체', '결제처리', '결제취소']}
          ariaLabel="상태"
        />
      </Group>
      <Divider />
      <Group label="과세구분">
        <Filter.Segment
          value={value.tax}
          onChange={(tax) => onChange({ ...value, tax })}
          options={['전체', '과세', '면세']}
          ariaLabel="과세구분"
        />
      </Group>
      <Divider />
      <Group label="합계">
        <Filter.Segment
          value={value.breakdown}
          onChange={(breakdown) => onChange({ ...value, breakdown })}
          options={['전체', '진료구분', '결제수단', '매입사']}
          ariaLabel="합계"
        />
      </Group>
    </Filter.Bar>
  )
}
