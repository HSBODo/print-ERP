import { Search } from 'lucide-react'
import { useContext } from 'react'

import { cn } from '#shared/utils/cn'

import { FilterContext } from '../context'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder: string
  /** 폭 지정 (기본 13rem) */
  className?: string
}

/**
 * 검색어 입력. <Filter> 안이면 Enter 가 [조회]다.
 * 화면에서 바로 거르는 키워드(로컬 조건)는 입력하는 즉시 반영되므로 Enter 가 할 일이 없다.
 */
export function Keyword({ value, onChange, placeholder, className }: Props) {
  const filter = useContext(FilterContext)

  return (
    <div className="flex h-8 items-center overflow-hidden rounded-md border border-border/80 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
      <Search className="ml-2.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
      <input
        type="search"
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) filter?.search()
        }}
        placeholder={placeholder}
        className={cn(
          'h-full w-[13rem] border-0 bg-white px-2 text-xs outline-none placeholder:text-gray-400',
          className,
        )}
      />
    </div>
  )
}
