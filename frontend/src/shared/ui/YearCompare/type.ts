/** 연도 하나 = 선 하나 */
export interface YearSeries {
  year: number
  /** chartData 의 열 이름 (y2026) */
  key: string
  color: string
  isLatest: boolean
}

/** 월 한 줄 — { month: '1월', y2025: 1945, y2026: 1892 } */
export type YearCompareRow = Record<string, string | number | null>

/** count = 건수(표 마지막 열 합계) · percent = 비율(소수 1자리, 마지막 열 평균) */
export type YearCompareFormat = 'count' | 'percent'

/** 특정 연도 선의 특정 달 점에 붙일 레이블 목록 (예: 이벤트 노트) */
export interface ChartMonthLabel {
  year: number
  /** 0 = 1월 */
  monthIndex: number
  labels: string[]
}
