import { useMemo, useState } from 'react'
import type { MedicalCategory } from '../../type/accounting'
import {
  useAccountingStatus,
  useMedicalMonthly,
} from '../../hooks/useAccounting'
import { AccountingMonthlyChart } from '../AccountingMonthlyChart'
import { ChartSegment } from '../AccountingChartControls'
import { downloadAccountingChartCsv } from '../../utils/accountingChartCsv'
import { buildMedicalChart, chartYears } from '../../utils/accountingChartModel'
import { dataStamp } from '../../utils/accountingModel'

const CATEGORIES: readonly MedicalCategory[] = [
  '전체',
  '외래',
  '입원',
  '백내장',
] as const

/**
 * 진료 매출 그래프 — 의사랑 수납 월별. 구분 필터는 행 마트가 있는 연도(2026~)를 단독으로 볼 때만 뜬다
 * (그 전 연도는 월집계만 있어 '전체' 만 가능 · 백엔드가 같은 규칙으로 응답한다).
 */
export function MedicalRevenueChartPage() {
  const status = useAccountingStatus()
  const monthlyFromYear = status.data?.medicalMonthlyFromYear
  const rowsFrom = status.data?.medicalFrom
  const rowsTo = status.data?.medicalTo
  const years = useMemo(() => chartYears(monthlyFromYear), [monthlyFromYear])
  // 행 마트가 있는 연도 — 이 연도를 단독 선택했을 때만 구분 필터가 뜬다.
  const rowYears = useMemo(() => {
    const from = rowsFrom?.slice(0, 4)
    const to = rowsTo?.slice(0, 4)
    return from && to ? years.filter((year) => year >= from && year <= to) : []
  }, [rowsFrom, rowsTo, years])
  const [selected, setSelected] = useState<string[]>([years[years.length - 1]])
  const [category, setCategory] = useState<MedicalCategory>('전체')
  const categoryEnabled =
    selected.length === 1 && rowYears.includes(selected[0])
  const effectiveCategory = categoryEnabled ? category : '전체'
  const query = useMedicalMonthly(selected.map(Number), effectiveCategory)
  const view = useMemo(
    () => buildMedicalChart(query.data ?? [], selected.map(Number)),
    [query.data, selected],
  )
  const stamp = dataStamp(status.data?.medicalLoadedAt)
  const toggleYear = (year: string) =>
    setSelected((current) =>
      current.includes(year)
        ? current.length === 1
          ? current
          : current.filter((item) => item !== year)
        : [...current, year].sort(),
    )

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[560px] flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-white p-1.5 shadow-sm">
        <span className="pl-1 text-[11px] text-gray-500">연도</span>
        <ChartSegment
          options={years}
          selected={selected}
          onToggle={toggleYear}
        />
        {categoryEnabled && (
          <>
            <span className="mx-1 h-6 w-px bg-gray-200" />
            <span className="text-[11px] text-gray-500">구분</span>
            <ChartSegment
              options={CATEGORIES}
              selected={[category]}
              onToggle={setCategory}
            />
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] text-gray-500">
            데이터 기준 <b className="text-gray-700">{stamp.date}</b>
          </span>
          <button
            type="button"
            onClick={() =>
              downloadAccountingChartCsv(
                `진료매출추이_${selected.join('-')}_${effectiveCategory}.csv`,
                view.tableRows,
              )
            }
            className="h-8 rounded-md border border-emerald-600 bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            CSV
          </button>
        </div>
      </div>
      {query.isError ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          진료 매출 그래프 데이터를 불러오지 못했습니다.
        </div>
      ) : (
        <AccountingMonthlyChart
          title="진료 매출 그래프"
          description="의사랑(IPLUS) 수납 기준 · 실수납합계 = 실수납액 + 미수회수(환불행은 −환불액) · 연도를 둘 이상 고르면 실수납합계만 비교합니다 · 구분 필터는 행 데이터가 있는 해(2026~)에만 동작합니다."
          view={view}
        />
      )}
    </div>
  )
}
