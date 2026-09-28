export function Select({ value, onChange, options, title }: {
  value: number
  onChange: (v: number) => void
  options: { value: number; label: string }[]
  title: string
}) {
  return (
    <div className="relative">
      <select
        value={value}
        title={title}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 appearance-none rounded-md border border-gray-200 bg-gray-50 pl-3 pr-7 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-white focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
        fill="none" viewBox="0 0 24 24" stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}
