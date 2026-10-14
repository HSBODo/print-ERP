import { useMemo, useState } from 'react'

import { MONTH_OPTIONS, YEAR_OPTIONS } from '#shared/constants/chart'
import { useFilter } from '#shared/hooks/useFilter'
import { useIsMobile } from '#shared/hooks/useIsMobile'
import { Filter } from '#shared/ui/Filter'

import { useSurgeryRatioComposition } from '../../hooks/useSurgeryRatioComposition'
import { CompositionPanel } from './CompositionPanel'
import { KpiCardsPanel } from './KpiCardsPanel'
import { EMPTY_DATA, SURGERY_TYPES, toYearMap } from './surgeryRatioUtils'
import { TrendPanel } from './TrendPanel'

/** 월 셀렉트의 "연간 전체" 센티널 — 0~11(월 index)과 겹치지 않는 -1. */
const ALL_MONTHS = -1
const MONTH_SELECT_OPTIONS = [
  { value: ALL_MONTHS, label: '연간 전체' },
  ...MONTH_OPTIONS,
]

/**
 * 주요 수술별 비중 — KPI · 유형별 점유율 · 상위 수술 월별 추이.
 *
 * 툴바는 기준 연도([조회] 때 반영) + 월(연간 전체 가능, 받아온 12개월에서 바로 고름)을 고른다. KPI·점유율은 고른 기간 기준이고,
 * 상위 수술 추이는 항상 그 연도의 12개월을 그린다(월 선택과 무관).
 * 종전 월별/연도별 비교 모드는 기간을 여러 개 추가해도 첫 번째만 반영돼 제거했다(2026-07-30).
 * 데이터는 GET /api/stats/surgery-ratio (= /surgery/monthly 와 동일 소스) 라이브.
 */
export function SurgeryRatioPage() {
  const filter = useFilter({
    defaults: () => ({ year: new Date().getFullYear() }),
    onReset: () => {
      setMonth(ALL_MONTHS)
    },
  })
  const { year } = filter.applied
  const [month, setMonth] = useState<number>(ALL_MONTHS)
  useIsMobile()

  const { data, isLoading, isFetching, isError, refetch } =
    useSurgeryRatioComposition([year])

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
      <Filter.Root filter={filter} isFetching={isFetching} refetch={refetch}>
        <Filter.Bar>
          <span className="pl-1 text-muted-foreground">기준 기간</span>
          <Filter.Select
            {...filter.field('year')}
            options={YEAR_OPTIONS}
            ariaLabel="기준 연도"
          />
          <Filter.Select
            value={month}
            onChange={setMonth}
            options={MONTH_SELECT_OPTIONS}
            ariaLabel="기준 월"
          />
          <span className="text-muted-foreground">
            KPI·점유율은 {baseLabel} 기준 · 추이는 {year}년 12개월
          </span>
          <Filter.Actions />
        </Filter.Bar>
      </Filter.Root>

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
