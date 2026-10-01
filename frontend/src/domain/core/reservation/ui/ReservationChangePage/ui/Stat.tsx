// 추이 달력 월 머리의 건수 배지.

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
