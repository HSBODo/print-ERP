import type {
  MedicalMonthlyMetric,
  VisionMonthlyMetric,
} from '../type/accounting'

export const MONTH_LABELS = Array.from(
  { length: 12 },
  (_, index) => `${index + 1}월`,
)
const YEAR_COLORS = ['#A8CEDF', '#94A3B8', '#4B5563', '#E11D2E']

export interface MonthlyChartRow {
  key: string
  label: string
  color: string
  values: (number | null)[]
  main?: boolean
  kind: 'amount' | 'count'
}

export interface MonthlyChartView {
  lines: MonthlyChartRow[]
  tableRows: MonthlyChartRow[]
}

const valuesOf = <T extends { month: number }>(
  rows: T[],
  getter: (row: T) => number,
) => {
  const values = Array<number | null>(12).fill(null)
  rows.forEach((row) => {
    values[row.month - 1] = Math.round(getter(row))
  })
  return values
}

/** 단일 연도 = 지표 4종(실수납합계·공단청구액·급여총액·비급여), 연도 비교 = 실수납합계만. 구분 필터는 API 가 적용한다. */
export function buildMedicalChart(
  metrics: MedicalMonthlyMetric[],
  selectedYears: number[],
): MonthlyChartView {
  const years = [...selectedYears].sort((a, b) => a - b)
  if (years.length > 1) {
    const lines = years.map((year, index): MonthlyChartRow => ({
      key: `medical-${year}`,
      label: `${year}년`,
      color:
        YEAR_COLORS[
          Math.min(
            index + YEAR_COLORS.length - years.length,
            YEAR_COLORS.length - 1,
          )
        ],
      values: valuesOf(
        metrics.filter((row) => row.year === year),
        (row) => row.net,
      ),
      main: index === years.length - 1,
      kind: 'amount',
    }))
    const counts = years.map((year): MonthlyChartRow => ({
      key: `medical-count-${year}`,
      label: `${year}년 건수`,
      color: '#9CA3AF',
      values: valuesOf(
        metrics.filter((row) => row.year === year),
        (row) => row.count,
      ),
      kind: 'count',
    }))
    return { lines, tableRows: [...counts, ...lines] }
  }

  const year = years[0]
  const rows = metrics.filter((row) => row.year === year)
  const count: MonthlyChartRow = {
    key: 'medical-count',
    label: '건수',
    color: '#6B7280',
    values: valuesOf(rows, (row) => row.count),
    kind: 'count',
  }
  const lines: MonthlyChartRow[] = [
    {
      key: 'net',
      label: '실수납합계',
      color: '#E11D2E',
      values: valuesOf(rows, (row) => row.net),
      main: true,
      kind: 'amount',
    },
    {
      key: 'claim',
      label: '공단청구액',
      color: '#4B5563',
      values: valuesOf(rows, (row) => row.claim),
      kind: 'amount',
    },
    {
      key: 'salary',
      label: '급여총액',
      color: '#A8CEDF',
      values: valuesOf(rows, (row) => row.salaryTotal),
      kind: 'amount',
    },
    {
      key: 'nonCovered',
      label: '비급여',
      color: '#F59E0B',
      values: valuesOf(rows, (row) => row.nonCovered),
      kind: 'amount',
    },
  ]
  return { lines, tableRows: [count, ...lines] }
}

export function buildVisionChart(
  metrics: VisionMonthlyMetric[],
  selectedYears: number[],
): MonthlyChartView {
  const years = [...selectedYears].sort((a, b) => a - b)
  const lines = years.map((year, index): MonthlyChartRow => ({
    key: `vision-${year}`,
    label: `${year}년`,
    color:
      years.length === 1
        ? '#E11D2E'
        : YEAR_COLORS[
            Math.min(
              index + YEAR_COLORS.length - years.length,
              YEAR_COLORS.length - 1,
            )
          ],
    values: valuesOf(
      metrics.filter((row) => row.year === year),
      (row) => row.amount,
    ),
    main: index === years.length - 1,
    kind: 'amount',
  }))
  const counts = years.map((year): MonthlyChartRow => ({
    key: `vision-count-${year}`,
    label: `${year}년 건수`,
    color: '#9CA3AF',
    values: valuesOf(
      metrics.filter((row) => row.year === year),
      (row) => row.count,
    ),
    kind: 'count',
  }))
  return { lines, tableRows: [...counts, ...lines] }
}

export const rowTotal = (row: MonthlyChartRow) =>
  row.values.reduce<number>((sum, value) => sum + (value ?? 0), 0)

/** 그래프 연도 후보 — 집계 시작 연도부터 올해까지. 적재 전이면 올해만. */
export const chartYears = (
  fromYear: number | null | undefined,
  today = new Date(),
): string[] => {
  const current = today.getFullYear()
  const start = fromYear ?? current
  return Array.from({ length: Math.max(1, current - start + 1) }, (_, index) =>
    String(start + index),
  )
}
