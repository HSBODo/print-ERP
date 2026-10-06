/** 특정 연도 선의 특정 달 점에 붙일 레이블 목록 (예: 이벤트 노트) */
export interface ChartMonthLabel {
  year: number
  /** 0 = 1월 */
  monthIndex: number
  labels: string[]
}
