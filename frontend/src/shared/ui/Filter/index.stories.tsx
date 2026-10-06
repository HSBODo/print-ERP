import type { Meta, StoryObj } from '@storybook/react-vite'
import { Download } from 'lucide-react'
import { useState } from 'react'

import { useFilter } from '#shared/hooks/useFilter'
import { Button } from '#shared/ui/Button'
import { Filter } from '#shared/ui/Filter'
import { currentMonth, thisMonthRange, yearsDesc } from '#shared/utils/date'

const STATUS = [
  { value: '', label: '상태 전체' },
  { value: 'done', label: '완료' },
]
const CHANNELS = ['전체', '콜', '온라인'] as const

/** 리스트 화면 — 조회 조건(기간·상태)은 [조회]로, 화면 조건(채널·키워드)은 자리만 빌려 바로 반영 */
function ListDemo() {
  const [channel, setChannel] = useState<string>('전체')
  const [keyword, setKeyword] = useState('')
  const filter = useFilter({
    defaults: () => ({ range: thisMonthRange(), status: '' }),
    onReset: () => {
      setChannel('전체')
      setKeyword('')
    },
  })

  return (
    <div className="flex flex-col gap-3 text-xs">
      <Filter.Root filter={filter}>
        <Filter.Bar>
          <Filter.DateRange {...filter.field('range')} maxDays={92} />
          <Filter.Select
            {...filter.field('status')}
            options={STATUS}
            ariaLabel="상태"
          />
          <Filter.Segment
            value={channel}
            onChange={setChannel}
            options={CHANNELS}
            ariaLabel="채널"
          />
          <Filter.Keyword
            value={keyword}
            onChange={setKeyword}
            placeholder="고객명 · 차트번호"
          />
          <Filter.Count value={1234} />
          <Filter.Actions>
            <Button
              type="button"
              size="sm"
              className="bg-emerald-600 text-xs text-white hover:bg-emerald-700"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
          </Filter.Actions>
        </Filter.Bar>
      </Filter.Root>
      <pre data-testid="state" className="rounded bg-gray-50 p-2">
        {JSON.stringify(
          {
            draft: filter.draft,
            applied: filter.applied,
            local: { channel, keyword },
          },
          null,
          2,
        )}
      </pre>
    </div>
  )
}

/** 월 하나 + 연도 셀렉트 */
function MonthDemo() {
  const filter = useFilter({
    defaults: () => ({ month: currentMonth(), year: new Date().getFullYear() }),
  })

  return (
    <Filter.Root filter={filter}>
      <Filter.Bar>
        <Filter.Month {...filter.field('month')} />
        <Filter.Select
          {...filter.field('year')}
          options={yearsDesc(2024).map((y) => ({ value: y, label: `${y}년` }))}
          ariaLabel="연도"
        />
        <Filter.Actions />
      </Filter.Bar>
    </Filter.Root>
  )
}

const meta = {
  title: 'shared/Filter',
  component: ListDemo,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof ListDemo>

export default meta
type Story = StoryObj<typeof meta>

export const 리스트: Story = {}

export const 월_선택: Story = { render: () => <MonthDemo /> }
