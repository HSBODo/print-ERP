import { CURRENT_YEAR } from '#shared/constants/chart'
import { FilterBar } from '#shared/ui/FilterBar'
import { useFilterBar } from '#shared/ui/FilterBar/useFilterBar'
import { YearCompare } from '#shared/ui/YearCompare'
import { useYearCompare } from '#shared/ui/YearCompare/useYearCompare'

import { useOutpatientCountTrend } from '../../hooks/useOutpatientCountTrend'

export function OutpatientCountPage() {
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

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[40rem] flex-col gap-6">
      <FilterBar {...filter} yearOnly yearChipColors={yearCompare.yearColors} />
      <YearCompare.Card
        isLoading={isLoading}
        isError={isError}
        title="월별 추이 비교"
        description="외래수는 외래 예약(F) 중 내원·퇴원 처리된 건수입니다. 2024·2025년은 확정값, 2026년부터는 운영 DB 집계입니다."
        series={yearCompare.series}
      >
        <YearCompare.Chart {...yearCompare} format="count" />
        <YearCompare.Table {...yearCompare} format="count" />
      </YearCompare.Card>
    </div>
  )
}
