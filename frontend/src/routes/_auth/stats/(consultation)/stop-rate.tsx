import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'

import { useEventNotesByYears } from '#domain/core/eventNote/hooks/useEventNotesByYears'
import { EventNoteDetailPanel } from '#domain/core/eventNote/ui/EventNoteDetailPanel'
import { useOverallExamMonthly } from '#domain/core/overall/hooks/useOverallExamMonthly'
import { CURRENT_YEAR } from '#shared/constants/chart'
import { FilterBar } from '#shared/ui/FilterBar'
import { useFilterBar } from '#shared/ui/FilterBar/useFilterBar'
import { YearCompare } from '#shared/ui/YearCompare'
import { useYearCompare } from '#shared/ui/YearCompare/useYearCompare'

export const Route = createFileRoute('/_auth/stats/(consultation)/stop-rate')({
  component: StopRatePage,
  staticData: {
    page: {
      id: 'stop-rate',
      label: '중단률',
      section: '전환&성공률',
      status: 'complete',
      access: { department: 'MEDICAL' },
    },
  },
})

function StopRatePage() {
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
  const eventNotes = useEventNotesByYears(filter.years)
  /** 마지막으로 가리킨 달 — 차트를 벗어나도 유지해 패널을 읽을 수 있게 한다 */
  const [activeMonth, setActiveMonth] = useState<number>()

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[40rem] flex-col gap-6">
      <FilterBar {...filter} yearOnly yearChipColors={yearCompare.yearColors} />
      <YearCompare.Card
        isLoading={overall.isLoading}
        isError={overall.isError}
        title="월별 추이 비교"
        description="중단율 (검사 중단 / 시력교정 검사자). 시력교정 검사자 대비 검사 중단(STOP_YN) 건 비율입니다."
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
