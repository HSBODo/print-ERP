export const MAX_PERIODS = 4

export const CURRENT_YEAR = new Date().getFullYear()
export const YEARS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i)
export const DEFAULT_BASE_YEAR = YEARS[0]
export const DEFAULT_COMPARE_YEAR = YEARS[1] ?? YEARS[0]

export const MONTHS = [
  '1월','2월','3월','4월','5월','6월',
  '7월','8월','9월','10월','11월','12월',
]

export const CHART_COLORS = [
  'var(--chart-1)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)',
]

export const YEAR_STROKE_PATTERNS = ['', '10 4', '4 4', '2 4']

export const CHIP_STYLES: Record<number, string> = {
  0: 'border-blue-400 text-blue-600',
  1: 'border-pink-400 text-pink-600',
  2: 'border-amber-400 text-amber-600',
  3: 'border-emerald-400 text-emerald-600',
}

export const YEAR_OPTIONS = YEARS.map((y) => ({ value: y, label: `${y}년` }))
export const MONTH_OPTIONS = MONTHS.map((m, i) => ({ value: i, label: m }))
