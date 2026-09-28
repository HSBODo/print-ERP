import { X } from 'lucide-react'
import { CHIP_STYLES } from '#shared/constants/chart'

export function PeriodChip({ label, index, isBase, onRemove, colorHex }: {
  label: string
  index: number
  isBase: boolean
  onRemove?: () => void
  /** 지정 시 CHIP_STYLES 대신 차트 시리즈 색상과 동일한 색으로 표시 */
  colorHex?: string
}) {
  const style = colorHex
    ? {
        borderColor: colorHex,
        color: colorHex,
        backgroundColor: `${colorHex}1F`,
        boxShadow: `inset 0 0 0 1px ${colorHex}33`,
      }
    : undefined

  return (
    <span
      className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-sm font-bold ${colorHex ? '' : CHIP_STYLES[index] ?? CHIP_STYLES[0]}`}
      style={style}
    >
      {isBase && (
        <span className="rounded bg-current/15 px-1.5 py-0.5 text-xs font-bold opacity-90">기준</span>
      )}
      {label}
      {onRemove && (
        <button
          type="button"
          title={`${label} 삭제`}
          onClick={onRemove}
          className="hover:opacity-60 transition-opacity"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </span>
  )
}
