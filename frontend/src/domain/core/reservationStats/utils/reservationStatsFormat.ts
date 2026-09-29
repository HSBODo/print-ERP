export type CellFormat = 'num' | 'pct'

/** Summary block percentages keep one decimal place to match the source PDF. */
export type SummaryFormat = 'num' | 'pct1'

export const formatNumber = (value: number): string => value.toLocaleString('ko-KR')

export const formatChannelValue = (value: number, format: CellFormat): string =>
  format === 'pct' ? `${value}%` : formatNumber(value)

export const formatSummaryValue = (value: number, format: SummaryFormat): string =>
  format === 'pct1' ? `${value.toFixed(1)}%` : formatNumber(value)
