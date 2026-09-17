import { useMemo, useState } from 'react'
import { useAccountingStatus, useVisionMonthly } from '@/hooks/accounting/useAccounting'
import { AccountingMonthlyChart } from './AccountingMonthlyChart'
import { ChartMetricBadge, ChartSegment } from './AccountingChartControls'
import { downloadAccountingChartCsv } from './accountingChartCsv'
import { buildVisionChart, chartYears, rowTotal } from './accountingChartModel'
import { dataStamp } from './accountingModel'

export function VisionRevenueChartPage() {
  const status = useAccountingStatus()
  const visionFrom = status.data?.visionFrom
  const years = useMemo(() => chartYears(visionFrom ? Number(visionFrom.slice(0, 4)) : null), [visionFrom])
  const [selected, setSelected] = useState<string[]>([years[years.length - 1]])
  const query = useVisionMonthly(selected.map(Number))
  const view = useMemo(() => buildVisionChart(query.data ?? [], selected.map(Number)), [query.data, selected])
  const currentYear = [...selected].sort().at(-1) ?? years[years.length - 1]
  const amountRow = view.lines.find((row) => row.label === `${currentYear}년`)
  const countRow = view.tableRows.find((row) => row.label === `${currentYear}년 건수`)
  const stamp = dataStamp(status.data?.visionLoadedAt)
  const toggleYear = (year: string) => setSelected((current) => current.includes(year)
    ? current.length === 1 ? current : current.filter((item) => item !== year)
    : [...current, year].sort())

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[560px] flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-white p-1.5 shadow-sm">
        <span className="pl-1 text-[11px] text-gray-500">연도</span>
        <ChartSegment options={years} selected={selected} onToggle={toggleYear} />
        <span className="mx-1 h-6 w-px bg-gray-200" />
        <ChartMetricBadge label={`${currentYear}년 건수`} value={`${Math.round(countRow ? rowTotal(countRow) : 0).toLocaleString('ko-KR')}건`} />
        <ChartMetricBadge label={`${currentYear}년 수납금액`} value={Math.round(amountRow ? rowTotal(amountRow) : 0).toLocaleString('ko-KR')} amber />
        <div className="ml-auto flex items-center gap-2"><span className="text-[11px] text-gray-500">데이터 기준 <b className="text-gray-700">{stamp.date}</b></span><button type="button" onClick={() => downloadAccountingChartCsv(`시력교정매출추이_${selected.join('-')}.csv`, view.tableRows)} className="h-8 rounded-md border border-emerald-600 bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700">CSV</button></div>
      </div>
      {query.isError ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">시력교정 매출 그래프 데이터를 불러오지 못했습니다.</div> : <AccountingMonthlyChart title="시력교정 매출 그래프" description="SOFTCRM 비급여 수납 기준 · 시력교정 매출 집계와 같은 수치(수납금액 총합) · 결제취소는 음수로 상계한 순액입니다 · 연도를 여러 개 고르면 겹쳐 비교합니다." view={view} />}
    </div>
  )
}
