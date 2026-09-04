import type { VisionReceipt } from '@/api/accounting'
import { VISION_COLUMNS, visionCellValue } from './visionRevenueColumns'

const escapeCsv = (value: unknown) => `"${String(value).replace(/"/g, '""')}"`

export function downloadVisionRevenueCsv(rows: VisionReceipt[], from: string, to: string) {
  const columns = VISION_COLUMNS.filter((column) => column.kind !== 'no')
  const lines = [columns.map((column) => escapeCsv(column.label)).join(',')]
  rows.forEach((row) => {
    lines.push(columns.map((column) => escapeCsv(visionCellValue(row, column.key))).join(','))
  })
  const blob = new Blob([`\ufeff${lines.join('\r\n')}\r\n`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `시력교정매출_${from}_${to}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
