import { ChevronDown } from 'lucide-react'

// 예약 변경이력 화면 전용 폼 primitive — 필터 바에서 반복 사용.
// 프로젝트 공용 셀렉트 컴포넌트가 아직 없어 이 도메인 안에서만 유지.

const SELECT_CLASS =
  'h-8 appearance-none rounded-md border border-border/80 bg-white pl-2.5 pr-7 text-xs text-gray-700 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

export function SelectBox<T extends string | number>({
  label,
  value,
  options,
  onChange,
  width = 'w-[7.5rem]',
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (v: string) => void
  width?: string
}) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${SELECT_CLASS} ${width}`}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
    </div>
  )
}

export function Segment<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex h-8 overflow-hidden rounded-md border border-border/80 bg-white">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`whitespace-nowrap border-l border-border/70 px-2.5 text-xs font-medium transition-colors first:border-l-0 ${value === o.value ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="flex h-7 items-center gap-1.5 whitespace-nowrap rounded-md border border-border/80 bg-white px-2.5 text-xs text-gray-600">
      <span>{label}</span>
      <strong className={`tabular-nums ${accent ?? 'text-gray-900'}`}>
        {value}
      </strong>
    </div>
  )
}
