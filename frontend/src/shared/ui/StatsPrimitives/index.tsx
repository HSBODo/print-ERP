import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { formatDelta } from '#shared/utils/statsUtils'

export interface SelectOption {
  value: number
  label: string
}

export function StatsSelect({
  value,
  onChange,
  options,
  title,
}: {
  value: number
  onChange: (value: number) => void
  options: SelectOption[]
  title: string
}) {
  return (
    <div className="relative">
      <select
        value={value}
        title={title}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-8 appearance-none rounded-md border border-gray-200 bg-gray-50 pl-3 pr-7 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-white focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}

export function TrendChip({ value, suffix }: { value: number; suffix: string }) {
  const positive = value > 0
  const neutral = value === 0
  const TrendIcon = neutral ? Minus : positive ? TrendingUp : TrendingDown

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
        neutral
          ? 'bg-gray-100 text-gray-600'
          : positive
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-rose-50 text-rose-700'
      }`}
    >
      <TrendIcon className="h-3 w-3" />
      {formatDelta(value, suffix)}
    </span>
  )
}
