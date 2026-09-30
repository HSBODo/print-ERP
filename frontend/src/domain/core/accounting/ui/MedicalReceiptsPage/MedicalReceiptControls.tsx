import { ChevronDown } from 'lucide-react'

import type { AccountingFilterState } from '../../type/filter'

export interface MedicalExtraFilters {
  insurance: string
  status: '전체' | '정상' | '취소'
  outstanding: '전체' | '미수있음'
  support: '전체' | '있음'
  breakdown: '전체' | '요청건'
}

interface ToolbarProps {
  value: AccountingFilterState
  dataDate: string
  dataRange: string
  onChange: (value: AccountingFilterState) => void
  onSearch: () => void
  onReset: () => void
  onCsv: () => void
}

const iso = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const monthRange = (month: string) => {
  const [year, monthNo] = month.split('-').map(Number)
  return { from: `${month}-01`, to: iso(new Date(year, monthNo, 0)) }
}

const weeksOfMonth = (month: string) => {
  const [year, monthNo] = month.split('-').map(Number)
  const first = new Date(year, monthNo - 1, 1)
  first.setDate(first.getDate() - ((first.getDay() + 6) % 7))
  const last = new Date(year, monthNo, 0)
  const weeks: { from: string; to: string; label: string }[] = []
  for (
    const monday = first;
    monday <= last;
    monday.setDate(monday.getDate() + 7)
  ) {
    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)
    weeks.push({
      from: iso(monday),
      to: iso(sunday),
      label: `${iso(monday).slice(5)}~${iso(sunday).slice(5)}`,
    })
  }
  return weeks
}

function Segment<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex h-8 overflow-hidden rounded-md border border-gray-300 bg-white">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`min-w-11 whitespace-nowrap border-l border-gray-200 px-2.5 text-xs font-medium first:border-l-0 ${value === option ? 'bg-slate-900 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

export function MedicalReceiptToolbar({
  value,
  dataDate,
  dataRange,
  onChange,
  onSearch,
  onReset,
  onCsv,
}: ToolbarProps) {
  const month = value.from.slice(0, 7)
  const weeks = weeksOfMonth(month)
  const setRange = (range: { from: string; to: string }) =>
    onChange({ ...value, ...range })
  const changeMode = (mode: AccountingFilterState['mode']) => {
    const range =
      mode === 'daily'
        ? { from: value.from, to: value.to }
        : mode === 'monthly'
          ? monthRange(month)
          : weeks[0]
    onChange({ ...value, mode, from: range.from, to: range.to })
  }
  const changeMonth = (nextMonth: string) => {
    const range =
      value.mode === 'weekly'
        ? weeksOfMonth(nextMonth)[0]
        : monthRange(nextMonth)
    setRange(range)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-gray-200 bg-white p-1.5 shadow-sm">
      <div className="relative flex-none">
        <select
          aria-label="기간 단위"
          value={value.mode}
          onChange={(e) =>
            changeMode(e.target.value as AccountingFilterState['mode'])
          }
          className="h-8 w-20 appearance-none rounded-md border border-gray-200 bg-white pl-2.5 pr-8 text-xs text-gray-700 outline-none transition-colors hover:border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          <option value="daily">일별</option>
          <option value="weekly">주차별</option>
          <option value="monthly">월별</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
      </div>
      {value.mode === 'daily' ? (
        <>
          <input
            aria-label="시작일"
            type="date"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className="h-8 w-[132px] rounded-md border border-gray-300 px-2 text-xs"
          />
          <span className="px-0.5 text-gray-400">~</span>
          <input
            aria-label="종료일"
            type="date"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className="h-8 w-[132px] rounded-md border border-gray-300 px-2 text-xs"
          />
        </>
      ) : (
        <>
          <input
            aria-label="기준 월"
            type="month"
            value={month}
            onChange={(e) => changeMonth(e.target.value)}
            className="h-8 w-[132px] rounded-md border border-gray-300 px-2 text-xs"
          />
          {value.mode === 'weekly' && (
            <select
              aria-label="주차"
              value={`${value.from}|${value.to}`}
              onChange={(e) => {
                const [from, to] = e.target.value.split('|')
                setRange({ from, to })
              }}
              className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs"
            >
              {weeks.map((week, index) => (
                <option key={week.from} value={`${week.from}|${week.to}`}>
                  {index + 1}주차 ({week.label})
                </option>
              ))}
            </select>
          )}
        </>
      )}
      <span className="mx-1 h-6 w-px bg-gray-200" />
      <Segment
        options={['전체', '외래', '입원', '백내장'] as const}
        value={value.category as '전체' | '외래' | '입원' | '백내장'}
        onChange={(category) => onChange({ ...value, category })}
      />
      <input
        aria-label="검색어"
        value={value.keyword}
        onChange={(e) => onChange({ ...value, keyword: e.target.value })}
        onKeyDown={(e) => e.key === 'Enter' && onSearch()}
        placeholder="환자명 · 차트번호 · 진료의사"
        className="h-8 w-[200px] rounded-md border border-gray-300 px-2.5 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      />
      <div className="ml-auto flex items-center gap-1.5">
        <span className="pr-1 text-[11px] text-gray-500">
          데이터 기준 <b className="text-gray-700">{dataDate}</b>
          {dataRange && <> · {dataRange}</>}
        </span>
        <button
          type="button"
          onClick={onReset}
          className="h-8 rounded-md border border-gray-300 bg-white px-3 text-xs font-medium hover:bg-gray-50"
        >
          초기화
        </button>
        <button
          type="button"
          onClick={onSearch}
          className="h-8 rounded-md border border-blue-600 bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700"
        >
          조회 (F1)
        </button>
        <button
          type="button"
          onClick={onCsv}
          className="h-8 rounded-md border border-emerald-600 bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          CSV
        </button>
      </div>
    </div>
  )
}

export function MedicalReceiptFilters({
  value,
  insuranceOptions,
  onChange,
}: {
  value: MedicalExtraFilters
  insuranceOptions: string[]
  onChange: (value: MedicalExtraFilters) => void
}) {
  const group = <T extends string>(
    label: string,
    key: keyof MedicalExtraFilters,
    options: readonly T[],
    current: T,
  ) => (
    <div className="flex items-center gap-1.5">
      <span className="whitespace-nowrap text-[11px] text-gray-500">
        {label}
      </span>
      <Segment
        options={options}
        value={current}
        onChange={(next) => onChange({ ...value, [key]: next })}
      />
    </div>
  )
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-gray-50/70 px-2.5 py-2 shadow-sm">
      {group('보험유형', 'insurance', insuranceOptions, value.insurance)}
      <span className="h-6 w-px bg-gray-200" />
      {group('상태', 'status', ['전체', '정상', '취소'] as const, value.status)}
      <span className="h-6 w-px bg-gray-200" />
      {group(
        '미수',
        'outstanding',
        ['전체', '미수있음'] as const,
        value.outstanding,
      )}
      <span className="h-6 w-px bg-gray-200" />
      {group(
        '지원금·건생비',
        'support',
        ['전체', '있음'] as const,
        value.support,
      )}
      <span className="h-6 w-px bg-gray-200" />
      {group('합계', 'breakdown', ['전체', '요청건'] as const, value.breakdown)}
    </div>
  )
}
