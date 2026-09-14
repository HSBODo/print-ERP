import type { MedicalReceipt, VisionReceipt } from '@/api/accounting'

export type PeriodMode = 'daily' | 'weekly' | 'monthly'

export interface TrendPoint {
  period: string
  total: number
  secondary: number
  tertiary: number
}

export const formatWon = (value: number): string => `${value.toLocaleString('ko-KR')}원`

export const formatWonCompact = (value: number | string): string => {
  const amount = Number(value)
  if (Math.abs(amount) >= 100_000_000) return `${(amount / 100_000_000).toFixed(1)}억`
  if (Math.abs(amount) >= 10_000) return `${Math.round(amount / 10_000).toLocaleString('ko-KR')}만`
  return amount.toLocaleString('ko-KR')
}

export const medicalNetRevenue = (row: MedicalReceipt): number =>
  row.serialNo === 98 ? -row.refund : row.actualPaid + row.outstandingRecovered

const weekStart = (isoDate: string): string => {
  const date = new Date(`${isoDate}T00:00:00`)
  const offset = (date.getDay() + 6) % 7
  date.setDate(date.getDate() - offset)
  return date.toLocaleDateString('sv-SE')
}

export const periodKey = (date: string, mode: PeriodMode): string => {
  if (mode === 'monthly') return date.slice(0, 7)
  if (mode === 'weekly') return weekStart(date)
  return date
}

export const matchesKeyword = (
  values: Array<string | number>,
  keyword: string,
): boolean => {
  const normalized = keyword.trim().toLowerCase()
  if (!normalized) return true
  return values.some((value) => String(value).toLowerCase().includes(normalized))
}

export const medicalTrend = (rows: MedicalReceipt[], mode: PeriodMode): TrendPoint[] => {
  const grouped = new Map<string, TrendPoint>()
  for (const row of rows) {
    const key = periodKey(row.receiptDate, mode)
    const point = grouped.get(key) ?? { period: key, total: 0, secondary: 0, tertiary: 0 }
    point.total += medicalNetRevenue(row)
    point.secondary += row.claimAmount
    point.tertiary += row.nonCovered
    grouped.set(key, point)
  }
  return [...grouped.values()].sort((a, b) => a.period.localeCompare(b.period))
}

export const visionTrend = (rows: VisionReceipt[], mode: PeriodMode): TrendPoint[] => {
  const grouped = new Map<string, TrendPoint>()
  for (const row of rows) {
    const key = periodKey(row.receiptDate, mode)
    const point = grouped.get(key) ?? { period: key, total: 0, secondary: 0, tertiary: 0 }
    point.total += row.amount
    if (row.paymentMethod === '카드') point.secondary += row.amount
    else point.tertiary += row.amount
    grouped.set(key, point)
  }
  return [...grouped.values()].sort((a, b) => a.period.localeCompare(b.period))
}

export interface VisionSummaryRow {
  procedure: string
  count: number
  card: number
  cashLike: number
  total: number
}

export const visionSummary = (rows: VisionReceipt[]): VisionSummaryRow[] => {
  const grouped = new Map<string, VisionSummaryRow>()
  for (const row of rows) {
    const summary = grouped.get(row.procedure) ?? {
      procedure: row.procedure, count: 0, card: 0, cashLike: 0, total: 0,
    }
    summary.count += row.status === '결제취소' ? -1 : 1
    summary.total += row.amount
    if (row.paymentMethod === '카드') summary.card += row.amount
    else summary.cashLike += row.amount
    grouped.set(row.procedure, summary)
  }
  return [...grouped.values()].sort((a, b) => b.total - a.total)
}
