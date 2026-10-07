import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { useEventNotesByYears } from '#domain/core/eventNote/hooks/useEventNotesByYears'
import { EventNoteDetailPanel } from '#domain/core/eventNote/ui/EventNoteDetailPanel'
import { useOutpatientCountTrend } from '#domain/core/outpatient/hooks/useOutpatientCountTrend'
import { CURRENT_YEAR } from '#shared/constants/chart'
import { FilterBar } from '#shared/ui/FilterBar'
import { useFilterBar } from '#shared/ui/FilterBar/useFilterBar'
import { YearCompare } from '#shared/ui/YearCompare'
import { useYearCompare } from '#shared/ui/YearCompare/useYearCompare'

export const Route = createFileRoute(
  '/_auth/stats/(outpatient)/outpatient-count',
)({
  component: OutpatientCountPage,
  staticData: {
    page: {
      id: 'outpatient-count',
      label: '외래수',
      section: '외래',
      status: 'complete',
      access: { department: 'MEDICAL' },
    },
  },
})

function OutpatientCountPage() {
  const filter = useFilterBar('year', [
    CURRENT_YEAR - 2,
    CURRENT_YEAR - 1,
    CURRENT_YEAR,
  ])
  const { dataMap, isLoading, isError } = useOutpatientCountTrend(filter.years)
  const yearCompare = useYearCompare(
    filter.years,
    (year, monthIndex) => dataMap[year]?.[monthIndex]?.outpatientCount,
  )
  const eventNotes = useEventNotesByYears(filter.years)
  /** 마지막으로 가리킨 달 — 차트를 벗어나도 유지해 패널을 읽을 수 있게 한다 */
  const [activeMonth, setActiveMonth] = useState<number>()

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[40rem] flex-col gap-6">
      <FilterBar {...filter} yearOnly yearChipColors={yearCompare.yearColors} />
      <YearCompare.Card
        isLoading={isLoading}
        isError={isError}
        title="월별 추이 비교"
        description="외래수는 외래 예약(F) 중 내원·퇴원 처리된 건수입니다. 2024·2025년은 확정값, 2026년부터는 운영 DB 집계입니다."
      >
        <div className="flex min-h-0 flex-1 gap-4">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
            <YearCompare.Chart
              {...yearCompare}
              format="count"
              annotations={eventNotes.monthLabels}
              onActiveMonthChange={setActiveMonth}
            />
            <YearCompare.Table {...yearCompare} format="count" />
          </div>
          <EventNoteDetailPanel
            notes={eventNotes.notes}
            monthIndex={activeMonth}
            yearColors={yearCompare.yearColors}
          />
        </div>
      </YearCompare.Card>
    </div>
  )
}
