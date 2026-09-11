import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { accountingApi } from '@/api/accounting'
import { AccountingMonthlyChart } from './AccountingMonthlyChart'
import { ChartSegment } from './AccountingChartControls'
import { downloadAccountingChartCsv } from './accountingChartCsv'
import { buildMedicalChart } from './accountingChartModel'

const YEARS = ['2023', '2024', '2025', '2026'] as const
const CATEGORIES = ['전체', '외래', '입원', '백내장'] as const

export function MedicalRevenueChartPage() {
  const [years, setYears] = useState<string[]>(['2026'])
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('전체')
  const query = useQuery({ queryKey: ['accounting-medical-monthly-mock'], queryFn: accountingApi.getMedicalMonthly })
  const view = useMemo(() => buildMedicalChart(query.data ?? [], years.map(Number), category), [query.data, years, category])
  const toggleYear = (year: string) => setYears((current) => current.includes(year)
    ? current.length === 1 ? current : current.filter((item) => item !== year)
    : [...current, year].sort())

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[560px] flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-white p-1.5 shadow-sm">
        <span className="pl-1 text-[11px] text-gray-500">연도</span>
        <ChartSegment options={YEARS} selected={years} onToggle={toggleYear} />
        {years.length === 1 && years[0] === '2026' && <><span className="mx-1 h-6 w-px bg-gray-200" /><span className="text-[11px] text-gray-500">구분</span><ChartSegment options={CATEGORIES} selected={[category]} onToggle={setCategory} /></>}
        <div className="ml-auto flex items-center gap-2"><span className="text-[11px] text-gray-500">데이터 기준 <b className="text-gray-700">2026-08-27</b></span><button type="button" onClick={() => downloadAccountingChartCsv(`진료매출추이_${years.join('-')}.csv`, view.tableRows)} className="h-8 rounded-md border border-emerald-600 bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700">CSV</button></div>
      </div>
      {query.isError ? <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">진료 매출 그래프 데이터를 불러오지 못했습니다.</div> : <AccountingMonthlyChart title="진료 매출 그래프" description="의사랑(IPLUS) 수납 기준 · 실수납합계 = 실수납액 + 미수입금(환불행은 −환불금) · 연도를 둘 이상 고르면 실수납합계만 비교합니다." view={view} />}
    </div>
  )
}
