import { useState } from 'react'

import { CURRENT_YEAR } from '#shared/constants/chart'
import { FilterBar } from '#shared/ui/FilterBar'
import { useFilterBar } from '#shared/ui/FilterBar/useFilterBar'
import { YearCompare } from '#shared/ui/YearCompare'
import { useYearCompare } from '#shared/ui/YearCompare/useYearCompare'

import { useExaminationTrend } from '../../hooks/useExaminationTrend'

type ExamTabKey = 'all' | 'visionCorrection' | 'dreamlens' | 'cataract'

const EXAM_TABS: { key: ExamTabKey; label: string }[] = [
  { key: 'all', label: '전체 검사건수' },
  { key: 'visionCorrection', label: '시력교정' },
  { key: 'dreamlens', label: '드림렌즈' },
  { key: 'cataract', label: '백내장' },
]

export function ExaminationPage() {
  const filter = useFilterBar('year', [
    CURRENT_YEAR - 2,
    CURRENT_YEAR - 1,
    CURRENT_YEAR,
  ])
  const [tab, setTab] = useState<ExamTabKey>('all')
  const { dataMap, isLoading, isError } = useExaminationTrend(filter.years)
  const yearCompare = useYearCompare(filter.years, (year, monthIndex) => {
    const item = dataMap[year]?.[monthIndex]
    return (tab === 'all' ? item?.examTotal : item?.[tab]) ?? 0
  })

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[40rem] flex-col gap-6">
      <FilterBar {...filter} yearOnly yearChipColors={yearCompare.yearColors} />
      <YearCompare.Card
        isLoading={isLoading}
        isError={isError}
        title="월별 추이 비교"
        description="전체는 시력교정, 드림렌즈, 백내장을 합산한 흐름으로, 탭을 선택하면 해당 검사만 표시됩니다."
        tabs={
          <YearCompare.Tabs value={tab} onChange={setTab} tabs={EXAM_TABS} />
        }
        series={yearCompare.series}
      >
        <YearCompare.Chart {...yearCompare} format="count" />
        <YearCompare.Table {...yearCompare} format="count" />
      </YearCompare.Card>
    </div>
  )
}
