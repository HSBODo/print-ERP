import { useMemo, useState } from 'react'
import { Select } from '@/components/filters/Select'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSurgeryRatioComposition } from '@/hooks/surgery/useSurgeryRatioComposition'
import { KpiCardsPanel } from './surgery-ratio/KpiCardsPanel'
import { CompositionPanel } from './surgery-ratio/CompositionPanel'
import { TrendPanel } from './surgery-ratio/TrendPanel'
import { SURGERY_TYPES, EMPTY_DATA, toYearMap } from './surgery-ratio/surgeryRatioUtils'
import { CURRENT_YEAR, YEAR_OPTIONS } from '@/constants/chart'

/**
 * 주요 수술별 비중 — KPI · 유형별 점유율 · 상위 수술 월별 추이.
 *
 * 툴바는 기준 연도 하나만 고른다. 세 패널 모두 단일 기간(연 합계 또는 그 연도의 12개월)을
 * 쓰기 때문에 월별/연도별 비교 UI는 이 페이지에 맞지 않아 제거했다(2026-07-30).
 * 데이터는 GET /api/stats/surgery-ratio (= /surgery/monthly 와 동일 소스) 라이브.
 */
export function SurgeryRatioPage() {
  const [year, setYear] = useState<number>(CURRENT_YEAR)
  useIsMobile()

  const { data, isLoading, isError } = useSurgeryRatioComposition([year])

  const dataMap = useMemo(() => (data ? toYearMap(data) : {}), [data])

  // 연 합계 — KPI·구성비의 기준값
  const selectedData = useMemo(() => {
    const months = dataMap[year] ?? []
    const summed = { ...EMPTY_DATA }
    for (const month of months) for (const type of SURGERY_TYPES) summed[type.key] += month[type.key]
    return summed
  }, [dataMap, year])

  return (
    <div className="space-y-6">
      {/* 예약통계·리스트 툴바와 동일 규격: flat white · px-2 py-1.5 · text-xs · 공유 Select(h-8) */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-white px-2 py-1.5 text-xs shadow-sm">
        <span className="text-muted-foreground">기준 연도</span>
        <Select value={year} onChange={setYear} options={YEAR_OPTIONS} title="기준 연도" />
        <div className="ml-auto rounded-md bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          조건 변경 시 즉시 반영
        </div>
      </div>

      <KpiCardsPanel
        selectedData={selectedData}
        baseLabel={`${year}년`}
        isLoading={isLoading}
        isError={isError}
      />
      <CompositionPanel
        selectedData={selectedData}
        baseLabel={`${year}년`}
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
