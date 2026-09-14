import type { PeriodMode } from './accountingModel'
import { monthRange, weeksOfMonth } from './accountingPeriod'
import { Segment, SelectBox } from './VisionRevenueControls'

export interface VisionSummaryFilter {
  mode: PeriodMode
  from: string
  to: string
  status: '전체' | '결제처리' | '결제취소'
  zeroRows: '표시' | '숨김'
}

interface Props {
  value: VisionSummaryFilter
  count: number
  dataDate: string
  dataRange: string
  onChange: (value: VisionSummaryFilter) => void
  onSearch: () => void
  onReset: () => void
  onCsv: () => void
}

const modeOptions = [
  { value: 'monthly', label: '월별' },
  { value: 'daily', label: '일별' },
  { value: 'weekly', label: '주차별' },
]

export function VisionRevenueSummaryControls({ value, count, dataDate, dataRange, onChange, onSearch, onReset, onCsv }: Props) {
  const month = value.from.slice(0, 7)
  const weeks = weeksOfMonth(month)
  const setRange = (range: { from: string; to: string }) => onChange({ ...value, ...range })
  const changeMode = (mode: PeriodMode) => {
    const range = mode === 'monthly'
      ? monthRange(month)
      : mode === 'weekly' ? weeks[0] : { from: value.from, to: value.to }
    onChange({ ...value, mode, ...range })
  }
  const changeMonth = (nextMonth: string) => {
    const range = value.mode === 'weekly' ? weeksOfMonth(nextMonth)[0] : monthRange(nextMonth)
    setRange(range)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-gray-200 bg-white p-1.5 shadow-sm">
      <SelectBox label="기간 단위" value={value.mode} options={modeOptions} width="w-20" onChange={(mode) => changeMode(mode as PeriodMode)} />
      {value.mode === 'daily' ? (
        <>
          <input aria-label="시작일" type="date" value={value.from} onChange={(event) => onChange({ ...value, from: event.target.value })} className="h-8 w-[132px] rounded-md border border-gray-300 px-2 text-xs" />
          <span className="px-0.5 text-gray-400">~</span>
          <input aria-label="종료일" type="date" value={value.to} onChange={(event) => onChange({ ...value, to: event.target.value })} className="h-8 w-[132px] rounded-md border border-gray-300 px-2 text-xs" />
        </>
      ) : (
        <>
          <input aria-label="기준 월" type="month" value={month} onChange={(event) => changeMonth(event.target.value)} className="h-8 w-[132px] rounded-md border border-gray-300 px-2 text-xs" />
          {value.mode === 'weekly' && <SelectBox label="주차" value={`${value.from}|${value.to}`} options={weeks.map((week, index) => ({ value: `${week.from}|${week.to}`, label: `${index + 1}주차 (${week.label})` }))} width="w-40" onChange={(range) => { const [from, to] = range.split('|'); setRange({ from, to }) }} />}
        </>
      )}
      <span className="mx-1 h-6 w-px bg-gray-200" />
      <span className="whitespace-nowrap text-[11px] text-gray-500">상태</span>
      <Segment options={['전체', '결제처리', '결제취소'] as const} value={value.status} onChange={(status) => onChange({ ...value, status })} />
      <span className="whitespace-nowrap pl-1 text-[11px] text-gray-500">0원 행</span>
      <Segment options={['표시', '숨김'] as const} value={value.zeroRows} onChange={(zeroRows) => onChange({ ...value, zeroRows })} />
      <div className="ml-1 flex h-8 items-center gap-1 rounded-md border border-gray-300 bg-white px-3 text-xs">
        <span className="text-gray-500">건수</span><strong className="tabular-nums text-gray-900">{count.toLocaleString('ko-KR')}</strong><span className="text-gray-500">건</span>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <span className="pr-1 text-[11px] text-gray-500">데이터 기준 <b className="text-gray-700">{dataDate}</b> · {dataRange}</span>
        <button type="button" onClick={onReset} className="h-8 rounded-md border border-gray-300 bg-white px-3 text-xs font-medium hover:bg-gray-50">초기화</button>
        <button type="button" onClick={onSearch} className="h-8 rounded-md border border-blue-600 bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700">조회</button>
        <button type="button" onClick={onCsv} className="h-8 rounded-md border border-emerald-600 bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700">CSV</button>
      </div>
    </div>
  )
}
