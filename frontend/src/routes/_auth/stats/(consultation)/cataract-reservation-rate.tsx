import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { useCataractReservationRateTrend } from '#domain/core/consultation/hooks/useCataractReservationRateTrend'
import { useEventNotesByYears } from '#domain/core/eventNote/hooks/useEventNotesByYears'
import { EventNoteDetailPanel } from '#domain/core/eventNote/ui/EventNoteDetailPanel'
import { CURRENT_YEAR } from '#shared/constants/chart'
import { FilterBar } from '#shared/ui/FilterBar'
import { useFilterBar } from '#shared/ui/FilterBar/useFilterBar'
import { YearCompare } from '#shared/ui/YearCompare'
import { useYearCompare } from '#shared/ui/YearCompare/useYearCompare'

export const Route = createFileRoute(
  '/_auth/stats/(consultation)/cataract-reservation-rate',
)({
  component: CataractReservationRatePage,
  staticData: {
    page: {
      id: 'cataract-reservation-rate',
      label: '예약률',
      section: '전환&성공률',
      status: 'complete',
      access: { department: 'MEDICAL' },
    },
  },
})

type RateTabKey = 'vision' | 'cataract'

const RATE_TABS: {
  key: RateTabKey
  label: string
  title: string
  description: string
}[] = [
  {
    key: 'vision',
    label: '시력교정 예약률',
    title: '시력교정 예약률 (수술예약건/검사자)',
    description: '시력교정 검사자 대비 수술예약건 비율입니다.',
  },
  {
    key: 'cataract',
    label: '백내장 예약률',
    title: '백내장 예약률 (수술예약건/백내장 진단자)',
    description:
      '백내장 검사 결과 좌·우 중 한쪽 이상 백내장으로 진단된 사람 대비 수술예약자 비율입니다.',
  },
]

function CataractReservationRatePage() {
  const filter = useFilterBar('year', [
    CURRENT_YEAR - 2,
    CURRENT_YEAR - 1,
    CURRENT_YEAR,
  ])
  const [tab, setTab] = useState<RateTabKey>('vision')
  const activeTab = RATE_TABS.find((item) => item.key === tab) ?? RATE_TABS[0]
  const rateQuery = useCataractReservationRateTrend(filter.years, tab)
  const yearCompare = useYearCompare(filter.years, (year, monthIndex) => {
    const item = rateQuery.dataMap[year]?.[monthIndex]
    return item?.examCount ? item.reservationRate : null
  })
  const eventNotes = useEventNotesByYears(filter.years)
  /** 마지막으로 가리킨 달 — 차트를 벗어나도 유지해 패널을 읽을 수 있게 한다 */
  const [activeMonth, setActiveMonth] = useState<number>()

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[40rem] flex-col gap-6">
      <FilterBar {...filter} yearOnly yearChipColors={yearCompare.yearColors} />
      <YearCompare.Card
        isLoading={rateQuery.isLoading}
        isError={rateQuery.isError}
        title="월별 추이 비교"
        description={`${activeTab.title}. ${activeTab.description}`}
        tabs={
          <YearCompare.Tabs value={tab} onChange={setTab} tabs={RATE_TABS} />
        }
      >
        <div className="flex min-h-0 flex-1 gap-4">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
            <YearCompare.Chart
              {...yearCompare}
              format="percent"
              annotations={eventNotes.monthLabels}
              onActiveMonthChange={setActiveMonth}
            />
            <YearCompare.Table {...yearCompare} format="percent" />
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
