import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { useEventNoteMonthLabels } from '#domain/core/eventNote/hooks/useEventNoteMonthLabels'
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
  const eventLabels = useEventNoteMonthLabels(filter.years)

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
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
            <ReservationOverallChart
              chartConfig={overall.chartConfig}
              chartData={overall.chartData}
              series={overall.series}
              annotations={eventLabels}
            />
            <ReservationOverallTable
              chartData={overall.chartData}
              series={overall.series}
            />
          </CardContent>
        </Card>
      </PanelShell>
    </div>
  )
}
