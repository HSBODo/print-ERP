import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import { useEventNotesByYears } from '#domain/core/eventNote/hooks/useEventNotesByYears'
import { EventNoteDetailPanel } from '#domain/core/eventNote/ui/EventNoteDetailPanel'
import { useExaminationTrend } from '#domain/core/exam/hooks/useExaminationTrend'
import { CURRENT_YEAR } from '#shared/constants/chart'
import { FilterBar } from '#shared/ui/FilterBar'
import { useFilterBar } from '#shared/ui/FilterBar/useFilterBar'
import { YearCompare } from '#shared/ui/YearCompare'
import { useYearCompare } from '#shared/ui/YearCompare/useYearCompare'

export const Route = createFileRoute('/_auth/stats/(exam)/examination')({
  component: ExaminationPage,
  staticData: {
    page: {
      id: 'examination',
      label: '시술별',
      section: '검사',
      status: 'complete',
      access: { department: 'MEDICAL' },
    },
  },
})

type ExamTabKey = 'all' | 'visionCorrection' | 'dreamlens' | 'cataract'

const EXAM_TABS: { key: ExamTabKey; label: string }[] = [
  { key: 'all', label: '전체 검사건수' },
  { key: 'visionCorrection', label: '시력교정' },
  { key: 'dreamlens', label: '드림렌즈' },
  { key: 'cataract', label: '백내장' },
]

function ExaminationPage() {
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
  const eventNotes = useEventNotesByYears(filter.years)
  /** 마지막으로 가리킨 달 — 차트를 벗어나도 유지해 패널을 읽을 수 있게 한다 */
  const [activeMonth, setActiveMonth] = useState<number>()

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
      >
        <div className="flex min-h-0 flex-1 gap-4">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
            <YearCompare.Chart
              {...yearCompare}
              format="count"
              annotations={eventNotes.monthLabels}
              onActiveMonthChange={setActiveMonth}
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
    </div>
  )
}
