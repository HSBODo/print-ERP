import { cn } from '#shared/utils/cn'

import { type Option, toOption } from './option'

interface Props<T extends string | number> {
  value: T
  onChange: (value: T) => void
  /** 값을 그대로 라벨로 쓰면 값 배열만 넘겨도 된다 */
  options: readonly (T | Option<T>)[]
  ariaLabel: string
}

/** 버튼 묶음 단일 선택 */
export function Segment<T extends string | number>({
  value,
  onChange,
  options,
  ariaLabel,
}: Props<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex h-8 overflow-hidden rounded-md border border-border/80 bg-white"
    >
      {options.map(toOption).map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            'min-w-[3rem] border-l border-border/70 px-2.5 text-xs font-medium whitespace-nowrap transition-colors first:border-l-0',
            option.value === value
              ? 'bg-gray-900 text-white'
              : 'text-gray-700 hover:bg-gray-50',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
