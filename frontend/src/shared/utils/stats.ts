import { MONTHS } from '#shared/constants/chart'

export interface Period {
  year: number
  month: number
}

export type CompareMode = 'month' | 'year'

export function changeRate(a: number, b: number): number {
  if (a === 0) return b === 0 ? 0 : 100
  return ((b - a) / a) * 100
}

export const periodLabel = (p: Period) => `${p.year}년 ${MONTHS[p.month]}`

export function getCurrentPeriod(now: Date = new Date()): Period {
  return {
    year: now.getFullYear(),
    month: now.getMonth(),
  }
}

export function shiftPeriod(period: Period, monthOffset: number): Period {
  const shifted = new Date(period.year, period.month + monthOffset, 1)
  return {
    year: shifted.getFullYear(),
    month: shifted.getMonth(),
  }
}

export function getDefaultPeriods(referencePeriod: Period = getCurrentPeriod()): Period[] {
  return [referencePeriod, shiftPeriod(referencePeriod, -1)]
}

export function getDefaultYears(referenceYear: number = getCurrentPeriod().year): number[] {
  return [referenceYear, referenceYear - 1]
}

export function formatAxisNumber(value: number | string): string {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue.toLocaleString('ko-KR') : String(value)
}

export function formatAxisPercent(value: number | string): string {
  return `${formatAxisNumber(value)}%`
}

export function formatAxisMan(value: number | string): string {
  return `${formatAxisNumber(value)}만`
}
