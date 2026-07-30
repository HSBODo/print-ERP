import { CURRENT_YEAR } from '@/constants/chart'

/** 월간 레포트 공통 상수/로직 (렌더 무관). 차트 서브컴포넌트는 MonthlyReportCharts.tsx. */

// 월간 레포트는 항상 3개년 비교: 전전년도 · 전년도 · 당해연도(=기준연도)
export const YEARS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR]

const now = new Date()
// 미래 월은 데이터 자체가 없으므로 null 처리. 당월은 누적 중이지만 값을 노출한다.
export const isIncompleteMonth = (year: number, monthIndex: number) =>
  year > now.getFullYear() || (year === now.getFullYear() && monthIndex > now.getMonth())

/**
 * MonthlyReportPage 도표별 UI 라벨 (title/suffix/format).
 * 24·25 확정값은 마트 시드(V12·V13·V14)로 이관됐고, 프론트는 API 응답만 사용한다.
 */
export interface ChartLabels {
  title: string
  suffix?: string
  format?: 'percent'
}

/**
 * 비율(%) 계열 차트 키 — 주차 보기에서 월값을 **합산이 아니라 가중평균**으로 분배해야 하는 지표.
 * (MonthlyReportPage 의 `charts` 키 기준)
 */
export const PERCENT_SERIES_KEYS = new Set<string>([
  'cataractRate', 'visionRate', 'ratioGeneral', 'rateVisionGeneral', 'rateOneday', 'stopRate',
  'successAll', 'successOneday', 'successGeneral',
])

export const MONTHLY_CHART_LABELS: Record<string, ChartLabels> = {
  'exam-general-customer': { title: '일반 고객 검사', suffix: '(소개 제외)' },
  'exam-referral-customer': { title: '고객소개 검사' },
  'exam-referral-staff': { title: '직원소개 검사' },
  'exam-worker': { title: '직장인 검사' },
  'exam-student': { title: '학생 검사' },
  'exam-etc': { title: '기타 검사', suffix: '(직장인·학생 제외)' },
  'exam-general': { title: '일반 검사' },
  'ratio-general': { title: '일반검사 비율', format: 'percent' },
  'rate-vision-general': { title: '시력교정 일반예약률', suffix: '(수술예약건/검사자)', format: 'percent' },
  'rate-oneday': { title: '원데이 예약률', suffix: '(수술예약건/검사자)', format: 'percent' },
  'stop-rate': { title: '중단율', format: 'percent' },
}
