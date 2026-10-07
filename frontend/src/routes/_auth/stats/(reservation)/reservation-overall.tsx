import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { useEventNotesByYears } from '#domain/core/eventNote/hooks/useEventNotesByYears'
import { EventNoteDetailPanel } from '#domain/core/eventNote/ui/EventNoteDetailPanel'
import { useReservationOverall } from '#domain/core/reservation/hooks/useReservationOverall'
import {
  RESERVATION_OVERALL_TABS,
  type ReservationOverallTab,
} from '#domain/core/reservation/utils/reservationOverallTabs'
import { CURRENT_YEAR } from '#shared/constants/chart'
import { FilterBar } from '#shared/ui/FilterBar'
import { useFilterBar } from '#shared/ui/FilterBar/useFilterBar'
import { YearCompare } from '#shared/ui/YearCompare'

export const Route = createFileRoute(
  '/_auth/stats/(reservation)/reservation-overall',
)({
  component: ReservationOverallPage,
  staticData: {
    page: {
      id: 'reservation-overall',
      label: '예약 종합',
      section: '예약',
      status: 'complete',
      access: { department: 'MEDICAL' },
    },
  },
})

function ReservationOverallPage() {
  const filter = useFilterBar('year', [
    CURRENT_YEAR - 2,
    CURRENT_YEAR - 1,
    CURRENT_YEAR,
  ])
  const [tab, setTab] = useState<ReservationOverallTab>('total')
  const current =
    RESERVATION_OVERALL_TABS.find((t) => t.key === tab) ??
    RESERVATION_OVERALL_TABS[0]
  const overall = useReservationOverall(filter.years, tab)
  const eventNotes = useEventNotesByYears(filter.years)
  /** 마지막으로 가리킨 달 — 차트를 벗어나도 유지해 패널을 읽을 수 있게 한다 */
  const [activeMonth, setActiveMonth] = useState<number>()

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[40rem] flex-col gap-6">
      <FilterBar {...filter} yearOnly yearChipColors={overall.yearColors} />
      <YearCompare.Card
        isLoading={overall.isLoading}
        isError={overall.isError}
        title={current.title}
        description={current.description}
        tabs={
          <YearCompare.Tabs
            value={tab}
            onChange={setTab}
            tabs={RESERVATION_OVERALL_TABS}
          />
        }
      >
        <div className="flex min-h-0 flex-1 gap-4">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
            <YearCompare.Chart
              {...overall}
              format="count"
              annotations={eventNotes.monthLabels}
              onActiveMonthChange={setActiveMonth}
            />
            <YearCompare.Table {...overall} format="count" />
          </div>
          <EventNoteDetailPanel
            notes={eventNotes.notes}
            monthIndex={activeMonth}
            yearColors={overall.yearColors}
          />
        </div>
      </YearCompare.Card>
    </div>
  )
}
