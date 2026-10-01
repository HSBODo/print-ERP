import {
  MONTH_LABELS,
  type MonthlyChartRow,
  rowTotal,
} from './accountingChartModel'

const escapeCsv = (value: unknown) => `"${String(value).replace(/"/g, '""')}"`

export function downloadAccountingChartCsv(
  filename: string,
  rows: MonthlyChartRow[],
) {
  const lines = [['구분', ...MONTH_LABELS, '합계'].map(escapeCsv).join(',')]
  rows.forEach((row) => {
    lines.push(
      [row.label, ...row.values.map((value) => value ?? ''), rowTotal(row)]
        .map(escapeCsv)
        .join(','),
    )
  })
  const url = URL.createObjectURL(
    new Blob([`\ufeff${lines.join('\r\n')}\r\n`], {
      type: 'text/csv;charset=utf-8',
    }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
