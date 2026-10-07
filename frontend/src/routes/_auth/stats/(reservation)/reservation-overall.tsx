import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { useEventNotesByYears } from '#domain/core/eventNote/hooks/useEventNotesByYears'
import { EventNoteDetailPanel } from '#domain/core/eventNote/ui/EventNoteDetailPanel'
import { useReservationOverall } from '#domain/core/reservation/hooks/useReservationOverall'
import { ReservationOverallChart } from '#domain/core/reservation/ui/ReservationOverallChart'
import { ReservationOverallHeader } from '#domain/core/reservation/ui/ReservationOverallHeader'
import { ReservationOverallTable } from '#domain/core/reservation/ui/ReservationOverallTable'
import type { ReservationOverallTab } from '#domain/core/reservation/utils/reservationOverallTabs'
import { CURRENT_YEAR } from '#shared/constants/chart'
import { Card, CardContent } from '#shared/ui/Card'
import { FilterBar } from '#shared/ui/FilterBar'
import { useFilterBar } from '#shared/ui/FilterBar/useFilterBar'
import { PanelShell } from '#shared/ui/PanelShell'

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
  const overall = useReservationOverall(filter.years, tab)
  const eventNotes = useEventNotesByYears(filter.years)
  /** 마지막으로 가리킨 달 — 차트를 벗어나도 유지해 패널을 읽을 수 있게 한다 */
  const [activeMonth, setActiveMonth] = useState<number>()

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[40rem] flex-col gap-6">
      <FilterBar {...filter} yearOnly yearChipColors={overall.yearColors} />
      <PanelShell
        isLoading={overall.isLoading}
        isError={overall.isError}
        variant="line"
        className="flex min-h-0 flex-1 flex-col"
      >
        <Card className="flex min-h-0 flex-1 flex-col border-border/70 shadow-sm">
          <ReservationOverallHeader
            tab={tab}
            onTabChange={setTab}
            series={overall.series}
          />
          <CardContent className="flex min-h-0 flex-1 gap-4">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
              <ReservationOverallChart
                chartConfig={overall.chartConfig}
                chartData={overall.chartData}
                series={overall.series}
                annotations={eventNotes.monthLabels}
                onActiveMonthChange={setActiveMonth}
              />
              <ReservationOverallTable
                chartData={overall.chartData}
                series={overall.series}
              />
            </div>
            <EventNoteDetailPanel
              notes={eventNotes.notes}
              monthIndex={activeMonth}
              yearColors={overall.yearColors}
            />
          </CardContent>
        </Card>
      </PanelShell>
    </div>
  )
}
