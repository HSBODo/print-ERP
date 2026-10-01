import { useMemo } from 'react'

import { useIsMobile } from '#shared/hooks/useIsMobile'
import { FilterBar } from '#shared/ui/FilterBar'
import { useFilterBar } from '#shared/ui/FilterBar/useFilterBar'
import { StatsGrid } from '#shared/ui/StatsGrid'
import { StatsStack } from '#shared/ui/StatsStack'

import { useConsultationRateComposition } from '../../hooks/useConsultationRateComposition'
import { useConsultationRateKpi } from '../../hooks/useConsultationRateKpi'
import { useConsultationRateTrend } from '../../hooks/useConsultationRateTrend'
import { toDataMap } from './consultationRateUtils'
import { KpiCardsPanel } from './KpiCardsPanel'
import { MonthComparePanel } from './MonthComparePanel'
import { YearTrendPanel } from './YearTrendPanel'

export function ConsultationRatePage() {
  const filter = useFilterBar()
  const isMobile = useIsMobile()
  const { mode, periods, years } = filter

  const queryYears = useMemo(() => {
    const source = mode === 'month' ? periods.map((p) => p.year) : years
    return [...new Set(source)].sort((a, b) => a - b)
  }, [mode, periods, years])

  const kpiQuery = useConsultationRateKpi(queryYears)
  const trendQuery = useConsultationRateTrend(queryYears)
  const compositionQuery = useConsultationRateComposition(queryYears)

  const kpiDataMap = useMemo(
    () => (kpiQuery.data ? toDataMap(kpiQuery.data) : {}),
    [kpiQuery.data],
  )

  const Container = isMobile ? StatsStack : StatsGrid

  return (
    <div className="space-y-6">
      <FilterBar {...filter} />
      <Container>
        <KpiCardsPanel
          dataMap={kpiDataMap}
          mode={mode}
          periods={periods}
          years={years}
          isLoading={kpiQuery.isLoading}
          isError={kpiQuery.isError}
        />
        {mode === 'month' ? (
          <MonthComparePanel
            dataMap={compositionQuery.dataMap}
            periods={periods}
            isLoading={compositionQuery.isLoading}
            isError={compositionQuery.isError}
          />
        ) : (
          <YearTrendPanel
            dataMap={trendQuery.dataMap}
            years={years}
            isLoading={trendQuery.isLoading}
            isError={trendQuery.isError}
          />
        )}
      </Container>
    </div>
  )
}
