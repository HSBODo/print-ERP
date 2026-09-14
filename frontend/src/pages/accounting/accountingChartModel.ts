import type { MedicalMonthlyMetric, VisionMonthlyMetric } from '@/api/accounting'

export const MONTH_LABELS = Array.from({ length: 12 }, (_, index) => `${index + 1}월`)
const YEAR_COLORS = ['#A8CEDF', '#94A3B8', '#4B5563', '#E11D2E']

export interface MonthlyChartRow {
  key: string
  label: string
  color: string
  values: Array<number | null>
  main?: boolean
  kind: 'amount' | 'count'
}

export interface MonthlyChartView {
  lines: MonthlyChartRow[]
  tableRows: MonthlyChartRow[]
}

const valuesOf = <T extends { month: number }>(rows: T[], getter: (row: T) => number, scale = 1) => {
  const values: Array<number | null> = Array(12).fill(null)
  rows.forEach((row) => { values[row.month - 1] = Math.round(getter(row) * scale) })
  return values
}

const categoryScale = (category: string) => ({ 외래: 0.43, 입원: 0.34, 백내장: 0.27 }[category] ?? 1)

export function buildMedicalChart(metrics: MedicalMonthlyMetric[], selectedYears: number[], category: string): MonthlyChartView {
  const years = [...selectedYears].sort()
  const scale = years.length === 1 && years[0] === 2026 ? categoryScale(category) : 1
  if (years.length > 1) {
    const lines = years.map((year, index): MonthlyChartRow => ({
      key: `medical-${year}`,
      label: `${year}년`,
      color: YEAR_COLORS[Math.min(index + YEAR_COLORS.length - years.length, YEAR_COLORS.length - 1)],
      values: valuesOf(metrics.filter((row) => row.year === year), (row) => row.net, scale),
      main: index === years.length - 1,
      kind: 'amount',
    }))
    const counts = years.map((year): MonthlyChartRow => ({
      key: `medical-count-${year}`,
      label: `${year}년 건수`,
      color: '#9CA3AF',
      values: valuesOf(metrics.filter((row) => row.year === year), (row) => row.count, scale),
      kind: 'count',
    }))
    return { lines, tableRows: [...counts, ...lines] }
  }

  const year = years[0]
  const rows = metrics.filter((row) => row.year === year)
  const count: MonthlyChartRow = { key: 'medical-count', label: '건수', color: '#6B7280', values: valuesOf(rows, (row) => row.count, scale), kind: 'count' }
  const lines: MonthlyChartRow[] = [
    { key: 'net', label: '실수납합계', color: '#E11D2E', values: valuesOf(rows, (row) => row.net, scale), main: true, kind: 'amount' },
    { key: 'claim', label: '공단청구액', color: '#4B5563', values: valuesOf(rows, (row) => row.claim, scale), kind: 'amount' },
    { key: 'salary', label: '급여총액', color: '#A8CEDF', values: valuesOf(rows, (row) => row.salaryTotal, scale), kind: 'amount' },
    { key: 'nonCovered', label: '비급여', color: '#F59E0B', values: valuesOf(rows, (row) => row.nonCovered, scale), kind: 'amount' },
  ]
  return { lines, tableRows: [count, ...lines] }
}

export function buildVisionChart(metrics: VisionMonthlyMetric[], selectedYears: number[]): MonthlyChartView {
  const years = [...selectedYears].sort()
  const lines = years.map((year, index): MonthlyChartRow => ({
    key: `vision-${year}`,
    label: `${year}년`,
    color: years.length === 1 ? '#E11D2E' : YEAR_COLORS[Math.min(index + YEAR_COLORS.length - years.length, YEAR_COLORS.length - 1)],
    values: valuesOf(metrics.filter((row) => row.year === year), (row) => row.amount),
    main: index === years.length - 1,
    kind: 'amount',
  }))
  const counts = years.map((year): MonthlyChartRow => ({
    key: `vision-count-${year}`,
    label: `${year}년 건수`,
    color: '#9CA3AF',
    values: valuesOf(metrics.filter((row) => row.year === year), (row) => row.count),
    kind: 'count',
  }))
  return { lines, tableRows: [...counts, ...lines] }
}

export const rowTotal = (row: MonthlyChartRow) => row.values.reduce<number>((sum, value) => sum + (value ?? 0), 0)
