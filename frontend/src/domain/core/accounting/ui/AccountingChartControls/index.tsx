export function ChartSegment<T extends string>({
  options,
  selected,
  onToggle,
}: {
  options: readonly T[]
  selected: T[]
  onToggle: (value: T) => void
}) {
  return (
    <div className="flex h-8 overflow-hidden rounded-md border border-gray-300 bg-white">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onToggle(option)}
          className={`min-w-11 whitespace-nowrap border-l border-gray-200 px-2.5 text-xs font-medium first:border-l-0 ${selected.includes(option) ? 'bg-slate-900 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

export function ChartMetricBadge({
  label,
  value,
  amber = false,
}: {
  label: string
  value: string
  amber?: boolean
}) {
  return (
    <div
      className={`flex h-8 items-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 text-xs ${amber ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-gray-300 bg-white text-gray-600'}`}
    >
      <span>{label}</span>
      <strong className="tabular-nums text-gray-900">{value}</strong>
    </div>
  )
}
