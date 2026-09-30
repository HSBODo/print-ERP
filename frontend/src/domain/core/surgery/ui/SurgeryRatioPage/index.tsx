import { useMemo, useState } from 'react'
import { Select } from '#shared/ui/Select'
import { useIsMobile } from '#shared/hooks/useIsMobile'
import { useSurgeryRatioComposition } from '../../hooks/useSurgeryRatioComposition'
import { KpiCardsPanel } from './KpiCardsPanel'
import { CompositionPanel } from './CompositionPanel'
import { TrendPanel } from './TrendPanel'
import { SURGERY_TYPES, EMPTY_DATA, toYearMap } from './surgeryRatioUtils'
import {
  CURRENT_YEAR,
  MONTH_OPTIONS,
  YEAR_OPTIONS,
} from '#shared/constants/chart'

/** 월 Select 의 "연간 전체" 센티널. Select 가 number 만 받으므로 0~11(월 index)과 겹치지 않는 -1을 쓴다. */
const ALL_MONTHS = -1
const MONTH_SELECT_OPTIONS = [
  { value: ALL_MONTHS, label: '연간 전체' },
  ...MONTH_OPTIONS,
]

/**
 * 주요 수술별 비중 — KPI · 유형별 점유율 · 상위 수술 월별 추이.
 *
 * 툴바는 기준 연도 + 월(연간 전체 가능)을 고른다. KPI·점유율은 고른 기간 기준이고,
 * 상위 수술 추이는 항상 그 연도의 12개월을 그린다(월 선택과 무관).
 * 종전 월별/연도별 비교 모드는 기간을 여러 개 추가해도 첫 번째만 반영돼 제거했다(2026-07-30).
 * 데이터는 GET /api/stats/surgery-ratio (= /surgery/monthly 와 동일 소스) 라이브.
 */
export function SurgeryRatioPage() {
  const [year, setYear] = useState<number>(CURRENT_YEAR)
  const [month, setMonth] = useState<number>(ALL_MONTHS)
  useIsMobile()

  const { data, isLoading, isError } = useSurgeryRatioComposition([year])

  const dataMap = useMemo(() => (data ? toYearMap(data) : {}), [data])

  // KPI·구성비 기준값 — 월을 고르면 그 달, '연간 전체'면 12개월 합계
  const selectedData = useMemo(() => {
    const months = dataMap[year] ?? []
    if (month !== ALL_MONTHS) return months[month] ?? EMPTY_DATA
    const summed = { ...EMPTY_DATA }
    for (const m of months)
      for (const type of SURGERY_TYPES) summed[type.key] += m[type.key]
    return summed
  }, [dataMap, year, month])

  const baseLabel =
    month === ALL_MONTHS ? `${year}년` : `${year}년 ${month + 1}월`

  return (
    <div className="space-y-6">
      {/* 예약통계·리스트 툴바와 동일 규격: flat white · px-2 py-1.5 · text-xs · 공유 Select(h-8) */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-white px-2 py-1.5 text-xs shadow-sm">
        <span className="text-muted-foreground">기준 기간</span>
        <Select
          value={year}
          onChange={setYear}
          options={YEAR_OPTIONS}
          title="기준 연도"
        />
        <Select
          value={month}
          onChange={setMonth}
          options={MONTH_SELECT_OPTIONS}
          title="기준 월"
        />
        <span className="text-muted-foreground">
          KPI·점유율은 {baseLabel} 기준 · 추이는 {year}년 12개월
        </span>
        <div className="ml-auto rounded-md bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          조건 변경 시 즉시 반영
        </div>
      </div>

      <KpiCardsPanel
        selectedData={selectedData}
        baseLabel={baseLabel}
        isLoading={isLoading}
        isError={isError}
      />
      <CompositionPanel
        selectedData={selectedData}
        baseLabel={baseLabel}
        isLoading={isLoading}
        isError={isError}
      />
      <TrendPanel
        trendYear={year}
        dataMap={dataMap}
        isLoading={isLoading}
        isError={isError}
      />
    </div>
  )
}
