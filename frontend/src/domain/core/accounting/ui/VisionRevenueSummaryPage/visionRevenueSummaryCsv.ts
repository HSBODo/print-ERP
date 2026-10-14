import {
  summaryCardTotal,
  summaryRowValues,
  summaryTotal,
  VISION_SUMMARY_ROWS,
  type VisionRevenueSummary,
} from './visionRevenueSummaryModel'

const escapeCsv = (value: unknown) => `"${String(value).replace(/"/g, '""')}"`

export function downloadVisionRevenueSummaryCsv(
  summary: VisionRevenueSummary,
  from: string,
  to: string,
) {
  const header = [
    '값',
    '현금',
    '카드 계',
    ...summary.columns.slice(1),
    '총합계',
  ]
  const csvRow = (label: string, values: number[]) => [
    label,
    values[0],
    summaryCardTotal(summary, values),
    ...values.slice(1),
    summaryTotal(values),
  ]
  const free = summary.columns.map((column) => summary.freeTotals[column])
  const taxed = summary.columns.map((column) => summary.taxedTotals[column])
  const all = summary.columns.map((column) => summary.columnTotals[column])
  const supply = taxed.map((value) => Math.round(value / 1.1))
  const vat = taxed.map((value, index) => value - supply[index])
  const lines = [
    header,
    ...VISION_SUMMARY_ROWS.map((row) =>
      csvRow(row.label, summaryRowValues(summary, row)),
    ),
    csvRow('총합계', all),
    csvRow('면세합계', free),
    csvRow('과세합계', taxed),
    csvRow('과세 공급가액 (÷1.1)', supply),
    csvRow('부가세', vat),
  ].map((row) => row.map(escapeCsv).join(','))
  const url = URL.createObjectURL(
    new Blob([`\ufeff${lines.join('\r\n')}\r\n`], {
      type: 'text/csv;charset=utf-8',
    }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = `시력교정매출집계_${from}_${to}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
