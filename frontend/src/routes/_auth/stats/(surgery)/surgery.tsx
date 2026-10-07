import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import { useEventNotesByYears } from '#domain/core/eventNote/hooks/useEventNotesByYears'
import { EventNoteDetailPanel } from '#domain/core/eventNote/ui/EventNoteDetailPanel'
import { useSurgeryComposition } from '#domain/core/surgery/hooks/useSurgeryComposition'
import { useSurgeryKpi } from '#domain/core/surgery/hooks/useSurgeryKpi'
import { useSurgeryTrend } from '#domain/core/surgery/hooks/useSurgeryTrend'
import { SurgeryKpiCardsPanel } from '#domain/core/surgery/ui/SurgeryKpiCardsPanel'
import { SurgeryMonthComparePanel } from '#domain/core/surgery/ui/SurgeryMonthComparePanel'
import {
  EMPTY,
  type GroupKey,
  GROUPS,
  gSum,
  toSurgeryDataMap,
} from '#domain/core/surgery/utils/surgeryGroups'
import { CURRENT_YEAR } from '#shared/constants/chart'
import { useIsMobile } from '#shared/hooks/useIsMobile'
import { FilterBar } from '#shared/ui/FilterBar'
import { useFilterBar } from '#shared/ui/FilterBar/useFilterBar'
import { StatsGrid } from '#shared/ui/StatsGrid'
import { StatsStack } from '#shared/ui/StatsStack'
import { YearCompare } from '#shared/ui/YearCompare'
import { useYearCompare } from '#shared/ui/YearCompare/useYearCompare'

export const Route = createFileRoute('/_auth/stats/(surgery)/surgery')({
  component: SurgeryPage,
  staticData: {
    page: {
      id: 'surgery',
      label: '수술 건수',
      section: '수술 건수',
      status: 'complete',
      access: { role: 'ADMIN' },
    },
  },
})

function SurgeryPage() {
  const filter = useFilterBar('year', [
    CURRENT_YEAR - 2,
    CURRENT_YEAR - 1,
    CURRENT_YEAR,
  ])
  const isMobile = useIsMobile()
  const { mode, periods, years } = filter
  const sortedYears = useMemo(
    () => [...years].sort((a, b) => a - b).slice(-3),
    [years],
  )
  const queryYears = useMemo(() => {
    const source = mode === 'month' ? periods.map((p) => p.year) : sortedYears
    return [...new Set(source)].sort((a, b) => a - b)
  }, [mode, periods, sortedYears])

  const kpiQuery = useSurgeryKpi(queryYears)
  const trendQuery = useSurgeryTrend(queryYears)
  const compositionQuery = useSurgeryComposition(queryYears)

  const kpiDataMap = useMemo(
    () => (kpiQuery.data ? toSurgeryDataMap(kpiQuery.data) : {}),
    [kpiQuery.data],
  )

  const [tab, setTab] = useState<GroupKey>('total')
  const activeGroup = GROUPS.find((item) => item.key === tab) ?? GROUPS[0]
  const yearCompare = useYearCompare(sortedYears, (year, monthIndex) =>
    gSum(trendQuery.dataMap[year]?.[monthIndex] ?? EMPTY, activeGroup),
  )
  const eventNotes = useEventNotesByYears(sortedYears)
  /** 마지막으로 가리킨 달 — 차트를 벗어나도 유지해 패널을 읽을 수 있게 한다 */
  const [activeMonth, setActiveMonth] = useState<number>()

  const Container = isMobile ? StatsStack : StatsGrid

  return (
    <div className="space-y-6">
      <FilterBar
        {...filter}
        yearOnly
        maxPeriods={3}
        yearChipColors={yearCompare.yearColors}
      />
      <Container>
        <SurgeryKpiCardsPanel
          dataMap={kpiDataMap}
          mode={mode}
          periods={periods}
          years={years}
          isLoading={kpiQuery.isLoading}
          isError={kpiQuery.isError}
        />
        {mode === 'month' ? (
          <SurgeryMonthComparePanel
            dataMap={compositionQuery.dataMap}
            periods={periods}
            isLoading={compositionQuery.isLoading}
            isError={compositionQuery.isError}
          />
        ) : (
          <YearCompare.Card
            isLoading={trendQuery.isLoading}
            isError={trendQuery.isError}
            title="월별 추이 비교"
            description="전체는 시력교정과 백내장을 합산한 흐름으로, 탭을 선택하면 해당 수술만 표시됩니다."
            tabs={
              <YearCompare.Tabs value={tab} onChange={setTab} tabs={GROUPS} />
            }
          >
            <div className="flex min-h-0 flex-1 gap-4">
              <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
                <YearCompare.Chart
                  {...yearCompare}
                  format="count"
                  annotations={eventNotes.monthLabels}
                  onActiveMonthChange={setActiveMonth}
                  className="h-96 flex-none"
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
        )}
      </Container>
    </div>
  )
}
