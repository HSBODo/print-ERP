import { ChevronDown } from 'lucide-react'

import { cn } from '#shared/utils/cn'

import { type Option, toOption } from './option'

interface Props<T extends string | number> {
  value: T
  onChange: (value: T) => void
  options: readonly (T | Option<T>)[]
  ariaLabel: string
  /** 폭 지정 (기본 내용 폭) */
  className?: string
}

/** 네이티브 셀렉트 — 값은 문자열·숫자 모두 받는다 */
export function Select<T extends string | number>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: Props<T>) {
  const normalized = options.map(toOption)

  return (
    <div className="relative">
      <select
        aria-label={ariaLabel}
        title={ariaLabel}
        value={String(value)}
        onChange={(e) => {
          const next = normalized.find(
            (o) => String(o.value) === e.target.value,
          )
          if (next) onChange(next.value)
        }}
        className={cn(
          'h-8 appearance-none rounded-md border border-border/80 bg-white pl-2.5 pr-8 text-xs outline-none transition-colors hover:border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100',
          className,
        )}
      >
        {normalized.map((option) => (
          <option key={option.value} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
    </div>
  )
}
