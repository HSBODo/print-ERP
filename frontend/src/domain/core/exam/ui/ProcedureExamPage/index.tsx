import { useState } from 'react'

import { CURRENT_YEAR } from '#shared/constants/chart'
import { FilterBar } from '#shared/ui/FilterBar'
import { useFilterBar } from '#shared/ui/FilterBar/useFilterBar'
import { YearCompare } from '#shared/ui/YearCompare'
import { useYearCompare } from '#shared/ui/YearCompare/useYearCompare'

import { useProcedureExamTrend } from '../../hooks/useProcedureExamTrend'

type ProcedureTabKey = 'examCount' | 'oneDayExamCount'

const PROCEDURE_TABS: {
  key: ProcedureTabKey
  label: string
  description: string
}[] = [
  {
    key: 'examCount',
    label: '검사수',
    description:
      '검사수는 시력교정·드림렌즈 검사(EXAM)와 백내장 검사(Cataract_Exam) 건수를 합산한 전체 검사 건수입니다. 2024·2025년은 확정값, 2026년부터는 운영 DB 집계입니다.',
  },
  {
    key: 'oneDayExamCount',
    label: '원데이 검사',
    description:
      '원데이 검사는 EXAM 기준 같은 날 검사OP(M/5)로 내원한 검사 중 중단·취소를 제외한 건수입니다. 2024·2025년은 확정값, 2026년부터는 운영 DB 집계입니다.',
  },
]

export function ProcedureExamPage() {
  const filter = useFilterBar('year', [
    CURRENT_YEAR - 2,
    CURRENT_YEAR - 1,
    CURRENT_YEAR,
  ])
  const [tab, setTab] = useState<ProcedureTabKey>('examCount')
  const currentTab =
    PROCEDURE_TABS.find((item) => item.key === tab) ?? PROCEDURE_TABS[0]
  const { dataMap, isLoading, isError } = useProcedureExamTrend(filter.years)
  const yearCompare = useYearCompare(
    filter.years,
    (year, monthIndex) => dataMap[year]?.[monthIndex]?.[tab] ?? 0,
  )

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[40rem] flex-col gap-6">
      <FilterBar {...filter} yearOnly yearChipColors={yearCompare.yearColors} />
      <YearCompare.Card
        isLoading={isLoading}
        isError={isError}
        title="월별 추이 비교"
        description={currentTab.description}
        tabs={
          <YearCompare.Tabs
            value={tab}
            onChange={setTab}
            tabs={PROCEDURE_TABS}
          />
        }
      >
        <YearCompare.Chart {...yearCompare} format="count" />
        <YearCompare.Table {...yearCompare} format="count" />
      </YearCompare.Card>
    </div>
  )
}
