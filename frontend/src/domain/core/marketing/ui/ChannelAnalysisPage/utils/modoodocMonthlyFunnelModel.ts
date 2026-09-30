import type { ReservationChannelFunnelItem } from '../../../type/api'

export const MODOODOC_FUNNEL_YEAR = 2026

export type ModoodocMonthlyFunnelSource = Pick<
  ReservationChannelFunnelItem,
  | 'reserved'
  | 'notCancel'
  | 'visited'
  | 'examined'
  | 'notStop'
  | 'surgery'
  | 'surgeryDone'
>

export type ModoodocMonthlyFunnelRow = ModoodocMonthlyFunnelSource & {
  month: string
  monthNumber: number
}

export type MonthRange = {
  month: number
  from: string
  to: string
}

const EMPTY_FUNNEL: ModoodocMonthlyFunnelSource = {
  reserved: 0,
  notCancel: 0,
  visited: 0,
  examined: 0,
  notStop: 0,
  surgery: 0,
  surgeryDone: 0,
}

const pad2 = (value: number) => String(value).padStart(2, '0')

export function buildYearMonthRanges(year: number): MonthRange[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1
    const yearMonth = `${year}-${pad2(month)}`
    const lastDay = new Date(year, month, 0).getDate()

    return {
      month,
      from: `${yearMonth}-01`,
      to: `${yearMonth}-${pad2(lastDay)}`,
    }
  })
}

export function findModoodocFunnel(
  rows: ReservationChannelFunnelItem[],
): ModoodocMonthlyFunnelSource | undefined {
  return rows.find((row) => row.channel.trim() === '모두닥')
}

export function toModoodocMonthlyRow(
  month: number,
  source?: ModoodocMonthlyFunnelSource,
): ModoodocMonthlyFunnelRow {
  return {
    month: `${month}월`,
    monthNumber: month,
    ...(source ?? EMPTY_FUNNEL),
  }
}
