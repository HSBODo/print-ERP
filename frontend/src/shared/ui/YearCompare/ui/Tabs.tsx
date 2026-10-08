import { cn } from '#shared/utils/cn'

interface Props<T extends string> {
  value: T
  onChange: (value: T) => void
  tabs: readonly { key: T; label: string }[]
}

/** 카드 머리 오른쪽 탭 — 같은 차트에서 볼 값(종합/온라인/콜 등)을 바꾼다 */
export function Tabs<T extends string>({ value, onChange, tabs }: Props<T>) {
  return (
    <div className="flex flex-wrap gap-1 rounded-md bg-gray-100 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={cn(
            'h-8 rounded px-3 text-sm font-medium transition-colors',
            tab.key === value
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
