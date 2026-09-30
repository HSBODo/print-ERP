import { toCsv } from '#shared/utils/csv'

type CsvValue = string | number

type CsvColumn = {
  key: PropertyKey
  label: string
}

export type CsvColumnGroup<TColumn> = {
  label: string
  columns: readonly TColumn[]
}

type CsvRow = {
  label: string
  weekday?: string
  muted?: boolean
  channel: object
  summary: object
}

type LeadingColumn<TRow> = {
  header: string
  value: (row: TRow) => CsvValue
}

interface BuildStatsCsvOptions<
  TColumn extends CsvColumn,
  TSummaryColumn extends CsvColumn,
  TRow extends CsvRow,
> {
  leading?: LeadingColumn<TRow>
  columnGroups: readonly CsvColumnGroup<TColumn>[]
  summaryColumns: readonly TSummaryColumn[]
  summaryGroupLabel?: string
}

export function buildStatsCsv<
  TColumn extends CsvColumn,
  TSummaryColumn extends CsvColumn,
  TRow extends CsvRow,
>(
  rows: readonly TRow[],
  options: BuildStatsCsvOptions<TColumn, TSummaryColumn, TRow>,
): string {
  const summaryGroupLabel = options.summaryGroupLabel ?? '종합'
  const channelColumns = options.columnGroups.flatMap((group) =>
    group.columns.map((column) => ({ group: group.label, column })),
  )
  const headers = [
    '구분',
    ...(options.leading ? [options.leading.header] : []),
    ...channelColumns.map(({ group, column }) => `${group}>${column.label}`),
    ...options.summaryColumns.map(
      (column) => `${summaryGroupLabel}>${column.label}`,
    ),
  ]

  const matrix = rows.map((row) => [
    row.weekday ? `${row.label}(${row.weekday})` : row.label,
    ...(options.leading ? [row.muted ? '' : options.leading.value(row)] : []),
    ...channelColumns.map(({ column }) =>
      row.muted
        ? ''
        : (row.channel as Record<PropertyKey, CsvValue>)[column.key],
    ),
    ...options.summaryColumns.map((column) =>
      row.muted
        ? ''
        : (row.summary as Record<PropertyKey, CsvValue>)[column.key],
    ),
  ])

  return toCsv(headers, matrix)
}
