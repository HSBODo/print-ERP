import type { UseQueryResult } from '@tanstack/react-query'
import { Plus } from 'lucide-react'

import type { FilterState } from '#shared/hooks/useFilter'
import { Button } from '#shared/ui/Button'
import { Filter } from '#shared/ui/Filter'

import type { EventNoteFilterValues } from '../../hooks/useEventNoteList'
import type { EventNotePage } from '../../type/api'

const PERIOD_OPTIONS = [
  { value: 'all' as const, label: '전체 기간' },
  { value: 'range' as const, label: '기간 지정' },
]

interface Props {
  filter: FilterState<EventNoteFilterValues>
  query: UseQueryResult<EventNotePage>
  /** 없으면 [등록] 을 숨긴다 (열람 전용) */
  onCreate?: () => void
}

/** 조회 조건 바 — 전체 기간 / 기간 지정 + 건수 + [등록] */
export function EventNoteFilter({ filter, query, onCreate }: Props) {
  return (
    <Filter.Root
      filter={filter}
      isFetching={query.isFetching}
      refetch={query.refetch}
    >
      <Filter.Bar>
        <Filter.Segment
          {...filter.field('period')}
          options={PERIOD_OPTIONS}
          ariaLabel="기간"
        />
        {filter.draft.period === 'range' && (
          <Filter.DateRange {...filter.field('range')} />
        )}
        <Filter.Count value={query.data?.totalElements ?? 0} />
        <Filter.Actions>
          {onCreate && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={onCreate}
            >
              <Plus className="h-3.5 w-3.5" />
              등록
            </Button>
          )}
        </Filter.Actions>
      </Filter.Bar>
    </Filter.Root>
  )
}
