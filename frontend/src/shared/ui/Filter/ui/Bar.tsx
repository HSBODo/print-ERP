import type { ReactNode } from 'react'

import { cn } from '#shared/utils/cn'

interface Props {
  children: ReactNode
  /** 둘째 줄 등 배경을 달리할 때 */
  className?: string
}

/** 필터 한 줄 — 조건 입력과, 자리를 빌린 화면 요소(로컬 조건·건수·버튼)가 놓인다 */
export function Bar({ children, className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1.5 rounded-md border border-border/70 bg-white px-1.5 py-1 text-xs shadow-sm',
        className,
      )}
    >
      {children}
    </div>
  )
}
