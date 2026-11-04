import { Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import {
  MAX_PERIODS,
  MONTH_OPTIONS,
  YEAR_OPTIONS,
} from '#shared/constants/chart'
import type { FilterBarControls } from '#shared/ui/FilterBar/useFilterBar'
import { PeriodChip } from '#shared/ui/PeriodChip'
import { Select } from '#shared/ui/Select'
import {
  getCurrentPeriod,
  getDefaultYears,
  periodLabel,
} from '#shared/utils/stats'

const currentPeriod = getCurrentPeriod()
const defaultYears = getDefaultYears()

export function FilterBar({
  mode,
  setMode,
  periods,
  setPeriods,
  years,
  setYears,
  removePeriod,
  yearOnly = false,
  maxPeriods = MAX_PERIODS,
  yearChipColors,
}: FilterBarControls & {
  yearOnly?: boolean
  maxPeriods?: number
  yearChipColors?: Record<number, string>
}) {
  const [addYear, setAddYear] = useState(currentPeriod.year)
  const [addMonth, setAddMonth] = useState(currentPeriod.month)
  const [addYearOnly, setAddYearOnly] = useState(
    defaultYears[1] ?? currentPeriod.year,
  )

  const addPeriod = () => {
    if (mode === 'month' && periods.length < maxPeriods) {
      if (periods.some((p) => p.year === addYear && p.month === addMonth)) {
        toast.warning('이미 추가된 기간입니다', {
          description: `${addYear}년 ${MONTH_OPTIONS[addMonth].label}`,
        })
        return
      }
      setPeriods([...periods, { year: addYear, month: addMonth }])
    }
    if (mode === 'year' && years.length < maxPeriods) {
      if (years.includes(addYearOnly)) {
        toast.warning('이미 추가된 연도입니다', {
          description: `${addYearOnly}년`,
        })
        return
      }
      setYears([...years, addYearOnly])
    }
  }

  return (
    // 툴바 규격: flat white · px-2 py-1.5 · text-xs · 공유 Select(h-8)
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-white px-2 py-1.5 text-xs shadow-sm">
      {/* 모드 토글 (yearOnly 페이지는 연도 비교만 지원) */}
      {!yearOnly && (
        <>
          <div className="flex h-8 items-center gap-1 rounded-md bg-gray-100 p-0.5">
            {(
              [
                ['month', '월별'],
                ['year', '연도별'],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`h-full rounded px-3 text-sm font-medium transition-colors ${
                  mode === m
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-gray-200" />
        </>
      )}

      {/* 기간 칩 */}
      {mode === 'month'
        ? periods.map((p, i) => (
            <PeriodChip
              key={`${p.year}-${p.month}`}
              label={periodLabel(p)}
              index={i}
              isBase={i === 0}
              onRemove={periods.length > 1 ? () => removePeriod(i) : undefined}
            />
          ))
        : years.map((y, i) => (
            <PeriodChip
              key={y}
              label={`${y}년`}
              index={i}
              isBase={i === 0}
              colorHex={yearChipColors?.[y]}
              onRemove={years.length > 1 ? () => removePeriod(i) : undefined}
            />
          ))}

      <div className="h-5 w-px bg-gray-200" />

      {/* 기간 추가 */}
      {((mode === 'month' && periods.length < maxPeriods) ||
        (mode === 'year' && years.length < maxPeriods)) && (
        <div className="flex items-center gap-1.5">
          {mode === 'month' ? (
            <>
              <Select
                value={addYear}
                onChange={setAddYear}
                options={YEAR_OPTIONS}
                title="추가 연도"
              />
              <Select
                value={addMonth}
                onChange={setAddMonth}
                options={MONTH_OPTIONS}
                title="추가 월"
              />
            </>
          ) : (
            <Select
              value={addYearOnly}
              onChange={setAddYearOnly}
              options={YEAR_OPTIONS}
              title="추가 연도"
            />
          )}
          <button
            type="button"
            onClick={addPeriod}
            className="flex h-8 items-center gap-1 rounded-md border border-dashed border-gray-300 px-3 text-sm font-medium text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700"
          >
            <Plus className="h-3.5 w-3.5" />
            추가
          </button>
        </div>
      )}

      <div className="ml-auto rounded-md bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
        조건 변경 시 즉시 반영
      </div>
    </div>
  )
}
