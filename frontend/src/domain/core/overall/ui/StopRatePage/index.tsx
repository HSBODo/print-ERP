import { useMemo } from 'react'

import { CURRENT_YEAR } from '#shared/constants/chart'
import { FilterBar } from '#shared/ui/FilterBar'
import { useFilterBar } from '#shared/ui/FilterBar/useFilterBar'
import { YearCompare } from '#shared/ui/YearCompare'
import { useYearCompare } from '#shared/ui/YearCompare/useYearCompare'

import { useOverallExamMonthly } from '../../hooks/useOverallExamMonthly'

export function StopRatePage() {
  const filter = useFilterBar('year', [
    CURRENT_YEAR - 2,
    CURRENT_YEAR - 1,
    CURRENT_YEAR,
  ])
  const overall = useOverallExamMonthly(filter.years)

  // 연·월별 {stopCount, visionExam} — 마트 응답을 (year → month → item) 로 정리
  const monthlySums = useMemo(() => {
    const acc: Record<
      number,
      ({ stopCount: number; visionExam: number } | undefined)[]
    > = {}
    for (const it of overall.items) {
      const rows = acc[it.year] ?? Array.from({ length: 12 }, () => undefined)
      rows[it.month - 1] = {
        stopCount: it.stopCount,
        visionExam: it.visionExam,
      }
      acc[it.year] = rows
    }
    return acc
  }, [overall.items])

  const yearCompare = useYearCompare(filter.years, (year, monthIndex) => {
    const sums = monthlySums[year]?.[monthIndex]
    return sums && sums.visionExam > 0
      ? (sums.stopCount / sums.visionExam) * 100
      : null
  })

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[40rem] flex-col gap-6">
      <FilterBar {...filter} yearOnly yearChipColors={yearCompare.yearColors} />
      <YearCompare.Card
        isLoading={overall.isLoading}
        isError={overall.isError}
        title="월별 추이 비교"
        description="중단율 (검사 중단 / 시력교정 검사자). 시력교정 검사자 대비 검사 중단(STOP_YN) 건 비율입니다."
      >
        <YearCompare.Chart {...yearCompare} format="percent" />
        <YearCompare.Table {...yearCompare} format="percent" />
      </YearCompare.Card>
    </div>
  )
}
