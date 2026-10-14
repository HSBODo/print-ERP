import type { ReactNode } from 'react'

interface Props {
  value: number
  label?: string
  unit?: string
  /** 건수 옆 부가 정보 (예: 백내장 검사수) */
  children?: ReactNode
}

/** 조회 결과 건수 */
export function Count({
  value,
  label = '조회건수',
  unit = '건',
  children,
}: Props) {
  return (
    <div
      className="flex h-8 items-center gap-2 rounded-md border border-border/80 bg-white px-3 text-xs"
      aria-live="polite"
    >
      <span className="text-muted-foreground">{label}</span>
      <strong className="text-gray-900 tabular-nums">
        {value.toLocaleString('ko-KR')}
        {unit}
      </strong>
      {children}
    </div>
  )
}
