import { ChevronDown } from 'lucide-react'
import type { AccountingFilterState } from '../../type/filter'
import { monthRange, weeksOfMonth } from '../../utils/accountingPeriod'

export interface VisionExtraFilters {
  category: string
  acquirer: string
  status: '전체' | '결제처리' | '결제취소'
  tax: '전체' | '과세' | '면세'
  breakdown: '전체' | '진료구분' | '결제수단' | '매입사'
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

export function Segment<T extends string>({
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

type SelectOption = string | { value: string; label: string }

export function SelectBox({
  label,
  value,
  options,
  width,
  onChange,
}: {
  label: string
  value: string
  options: SelectOption[]
  width: string
  onChange: (value: string) => void
}) {
  return (
    <div className="relative flex-none">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${width} h-8 appearance-none rounded-md border border-gray-200 bg-white pl-2.5 pr-8 text-xs text-gray-700 outline-none transition-colors hover:border-gray-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100`}
      >
        {options.map((option) => {
          const optionValue = typeof option === 'string' ? option : option.value
          const optionLabel = typeof option === 'string' ? option : option.label
          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          )
        })}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
    </div>
  )
}

export function VisionRevenueToolbar({
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
  const changeMonth = (nextMonth: string) =>
    setRange(
      value.mode === 'weekly'
        ? weeksOfMonth(nextMonth)[0]
        : monthRange(nextMonth),
    )

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-gray-200 bg-white p-1.5 shadow-sm">
      <SelectBox
        label="기간 단위"
        value={value.mode}
        options={[
          { value: 'daily', label: '일별' },
          { value: 'weekly', label: '주차별' },
          { value: 'monthly', label: '월별' },
        ]}
        width="w-20"
        onChange={(mode) => changeMode(mode as AccountingFilterState['mode'])}
      />
      {value.mode === 'daily' ? (
        <>
          <input
            aria-label="시작일"
            type="date"
            value={value.from}
            onChange={(event) =>
              onChange({ ...value, from: event.target.value })
            }
            className="h-8 w-[132px] rounded-md border border-gray-300 px-2 text-xs"
          />
          <span className="px-0.5 text-gray-400">~</span>
          <input
            aria-label="종료일"
            type="date"
            value={value.to}
            onChange={(event) => onChange({ ...value, to: event.target.value })}
            className="h-8 w-[132px] rounded-md border border-gray-300 px-2 text-xs"
          />
        </>
      ) : (
        <>
          <input
            aria-label="기준 월"
            type="month"
            value={month}
            onChange={(event) => changeMonth(event.target.value)}
            className="h-8 w-[132px] rounded-md border border-gray-300 px-2 text-xs"
          />
          {value.mode === 'weekly' && (
            <SelectBox
              label="주차"
              value={`${value.from}|${value.to}`}
              options={weeks.map((week, index) => ({
                value: `${week.from}|${week.to}`,
                label: `${index + 1}주차 (${week.label})`,
              }))}
              width="w-40"
              onChange={(range) => {
                const [from, to] = range.split('|')
                setRange({ from, to })
              }}
            />
          )}
        </>
      )}
      <span className="mx-1 h-6 w-px bg-gray-200" />
      <Segment
        options={['전체', '카드', '현금'] as const}
        value={value.category as '전체' | '카드' | '현금'}
        onChange={(category) => onChange({ ...value, category })}
      />
      <input
        aria-label="검색어"
        value={value.keyword}
        onChange={(event) =>
          onChange({ ...value, keyword: event.target.value })
        }
        onKeyDown={(event) => event.key === 'Enter' && onSearch()}
        placeholder="고객명 · 고객번호 · 집도의 · 상담사"
        className="h-8 w-[210px] rounded-md border border-gray-300 px-2.5 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      />
      <div className="ml-auto flex items-center gap-1.5">
        <span className="pr-1 text-[11px] text-gray-500">
          데이터 기준 <b className="text-gray-700">{dataDate}</b> · {dataRange}
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
          조회
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

export function VisionRevenueFilters({
  value,
  categories,
  acquirers,
  onChange,
}: {
  value: VisionExtraFilters
  categories: string[]
  acquirers: string[]
  onChange: (value: VisionExtraFilters) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-gray-200 bg-gray-50/70 px-2.5 py-2 shadow-sm">
      <div className="flex items-center gap-1.5">
        <span className="whitespace-nowrap text-[11px] text-gray-500">
          진료구분
        </span>
        <SelectBox
          label="진료구분"
          value={value.category}
          options={categories}
          width="w-[150px]"
          onChange={(category) => onChange({ ...value, category })}
        />
      </div>
      <span className="h-6 w-px bg-gray-200" />
      <div className="flex items-center gap-1.5">
        <span className="whitespace-nowrap text-[11px] text-gray-500">
          매입사
        </span>
        <SelectBox
          label="매입사"
          value={value.acquirer}
          options={acquirers}
          width="w-[140px]"
          onChange={(acquirer) => onChange({ ...value, acquirer })}
        />
      </div>
      <span className="h-6 w-px bg-gray-200" />
      <div className="flex items-center gap-1.5">
        <span className="whitespace-nowrap text-[11px] text-gray-500">
          상태
        </span>
        <Segment
          options={['전체', '결제처리', '결제취소'] as const}
          value={value.status}
          onChange={(status) => onChange({ ...value, status })}
        />
      </div>
      <span className="h-6 w-px bg-gray-200" />
      <div className="flex items-center gap-1.5">
        <span className="whitespace-nowrap text-[11px] text-gray-500">
          과세구분
        </span>
        <Segment
          options={['전체', '과세', '면세'] as const}
          value={value.tax}
          onChange={(tax) => onChange({ ...value, tax })}
        />
      </div>
      <span className="h-6 w-px bg-gray-200" />
      <div className="flex items-center gap-1.5">
        <span className="whitespace-nowrap text-[11px] text-gray-500">
          합계
        </span>
        <Segment
          options={['전체', '진료구분', '결제수단', '매입사'] as const}
          value={value.breakdown}
          onChange={(breakdown) => onChange({ ...value, breakdown })}
        />
      </div>
    </div>
  )
}
