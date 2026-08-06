import type { ReactNode } from 'react'
import { CURRENT_YEAR } from '@/constants/chart'
import {
  StopReasonBar,
  ReportSurgeryTable,
  ReportSuccessRateChart,
  ReportExamByClassChart,
} from './MonthlyReportCharts'
import { MONTHLY_CHART_LABELS } from './monthlyReportUtils'
import type { ReportSeriesKey, ReportSeriesResult } from './useReportSeries'

/**
 * 레포트 도표 목차(월간보고 순서) — 월간 레포트·주차 레포트가 같은 목록을 쓴다.
 *
 *  - `chart`: 연도 비교 라인차트. 월간은 월축, 주차는 주차축으로 각 페이지가 렌더한다.
 *  - `node`: 월 기준 전용 도표(주차로 분해 불가) — 주차 레포트에서도 월 기준으로 표시한다.
 *  - 둘 다 없으면 미완성(목차에 회색 표시).
 */
export interface ReportItem {
  group: string
  id: string
  label: string
  chart?: {
    title: string
    suffix?: string
    format?: 'percent'
    series: ReportSeriesKey
    /** 기본 3개년(YEARS) 외의 연도 집합을 쓸 때 */
    years?: number[]
    /**
     * Y축 고정 범위 — **월간 값 기준으로 잡은 값이다.**
     * 주차 값은 자릿수가 한 단계 작아(예약 종합: 월 1,000~3,000 vs 주 168~608) 그대로 쓰면
     * 선이 축 바닥에 깔린다. 주차 레포트는 이 값을 쓰지 않고 데이터 스케일에 맞춘다.
     */
    yDomain?: [number, number]
    percentFractionDigits?: number
  }
  node?: ReactNode
  /**
   * 주차 레포트에만 싣는 항목. 월간 대응 데이터가 없어(주간보고 확정값) 월간에서는 빈 차트가 되므로
   * MonthlyReportPage 가 걸러낸다.
   */
  weeklyOnly?: boolean
}

export const isDoneItem = (it: ReportItem) => Boolean(it.chart || it.node)

export interface ReportItemsOptions {
  /** 중단 사유 도표에서 보고 있는 월 (1-12) */
  stopReasonMonth: number
  onStopReasonMonthChange: (month: number) => void
}

export function buildReportItems(
  s: ReportSeriesResult,
  { stopReasonMonth, onStopReasonMonthChange }: ReportItemsOptions,
): ReportItem[] {
  const { charts } = s
  return [
    { group: '예약', id: 'reservation-overall', label: '예약 종합 (콜·온라인)', chart: { title: '예약 종합', suffix: '(콜, 온라인)', series: 'reservations', yDomain: [800, 3000] } },
    { group: '예약', id: 'reservation-call', label: '콜 예약 (인콜·아웃콜)', chart: { title: '콜 예약', suffix: '(인콜, 아웃콜)', series: 'call' } },
    { group: '예약', id: 'reservation-online', label: '온라인 예약 (네이버·카카오·홈페이지)', chart: { title: '온라인 예약', suffix: '(네이버, 카카오, 홈페이지)', series: 'online' } },
    { group: '검사 유입', id: 'exam-general-customer', label: '일반 고객 검사 (소개 제외)', chart: { ...MONTHLY_CHART_LABELS['exam-general-customer'], series: 'examGeneralCustomer' } },
    { group: '검사 유입', id: 'exam-referral-customer', label: '고객소개 검사', chart: { ...MONTHLY_CHART_LABELS['exam-referral-customer'], series: 'examReferralCustomer' } },
    { group: '검사 유입', id: 'exam-referral-staff', label: '직원소개 검사', chart: { ...MONTHLY_CHART_LABELS['exam-referral-staff'], series: 'examReferralStaff' } },
    // 라이브 전용 도표라 API 미연결(503)·무데이터면 도표 자체가 없다 — 목차에도 '미완성'으로 둔다.
    { group: '검사 유입', id: 'exam-by-class', label: '고객분류별 검사수', node: s.examByClassRows.length ? <ReportExamByClassChart year={CURRENT_YEAR} rows={s.examByClassRows} /> : undefined },
    { group: '검사 유입', id: 'exam-worker', label: '직장인 검사', chart: { ...MONTHLY_CHART_LABELS['exam-worker'], series: 'examWorker' } },
    { group: '검사 유입', id: 'exam-student', label: '학생 검사', chart: { ...MONTHLY_CHART_LABELS['exam-student'], series: 'examStudent' } },
    { group: '검사 유입', id: 'exam-etc', label: '기타 검사', chart: { ...MONTHLY_CHART_LABELS['exam-etc'], series: 'examEtc' } },
    { group: '검사수', id: 'exam-cataract', label: '백내장 검사수', chart: { title: '백내장 검사수', series: 'cataractExam' } },
    { group: '검사수', id: 'exam-vision', label: '시력교정 검사', chart: { title: '시력교정 검사', series: 'visionExam' } },
    // 드림렌즈 2종은 외래센터 주간보고 확정값(마트 골든 시드). 사내 시스템에 신규/FU 구분 소스가 없어
    // 주차 단위 확정값만 존재한다 → 주차 레포트 전용.
    { group: '검사수', id: 'dreamlens-new', label: '드림렌즈 신규수', weeklyOnly: true, chart: { title: '드림렌즈 신규수', series: 'dreamlensNew' } },
    { group: '검사수', id: 'dreamlens-fu', label: '드림렌즈 FU수', weeklyOnly: true, chart: { title: '드림렌즈 FU수', series: 'dreamlensFu' } },
    { group: '검사수', id: 'exam-count', label: '검사수', chart: { title: '검사수', series: 'examCount' } },
    { group: '검사수', id: 'exam-oneday', label: '원데이 검사', chart: { title: '원데이 검사', series: 'oneDayExam' } },
    { group: '검사수', id: 'exam-general', label: '일반 검사', chart: { ...MONTHLY_CHART_LABELS['exam-general'], series: 'examGeneral' } },
    { group: '비율', id: 'ratio-general', label: '일반검사 비율', chart: { ...MONTHLY_CHART_LABELS['ratio-general'], series: 'ratioGeneral' } },
    { group: '비율', id: 'rate-cataract', label: '백내장 예약률', chart: { title: '백내장 예약률', suffix: '(수술예약건/검사자)', format: 'percent', series: 'cataractRate' } },
    { group: '비율', id: 'rate-vision', label: '시력교정 예약률', chart: { title: '시력교정 예약률', suffix: '(수술예약건/검사자)', format: 'percent', series: 'visionRate' } },
    { group: '비율', id: 'rate-vision-general', label: '시력교정 일반예약률', chart: { ...MONTHLY_CHART_LABELS['rate-vision-general'], series: 'rateVisionGeneral' } },
    { group: '비율', id: 'rate-oneday', label: '원데이 예약률', chart: { ...MONTHLY_CHART_LABELS['rate-oneday'], series: 'rateOneday' } },
    { group: '전환&성공', id: 'success-rate', label: '시력교정 상담성공률', node: <ReportSuccessRateChart year={CURRENT_YEAR} all={charts.successAll[CURRENT_YEAR] ?? []} oneday={charts.successOneday[CURRENT_YEAR] ?? []} general={charts.successGeneral[CURRENT_YEAR] ?? []} /> },
    { group: '중단', id: 'stop-rate', label: '중단율', chart: { ...MONTHLY_CHART_LABELS['stop-rate'], series: 'stopRate', years: s.stopRateYears.length ? s.stopRateYears : [CURRENT_YEAR], percentFractionDigits: 1 } },
    { group: '중단', id: 'stop-reason', label: '중단 사유', node: <StopReasonBar year={CURRENT_YEAR} items={s.stopReasonDataMap[CURRENT_YEAR] ?? []} month={stopReasonMonth} onMonthChange={onStopReasonMonthChange} /> },
    // 순서 주의 — 총 수술수(합계)를 먼저 보이고 그 아래에 백내장·시력교정 분해를 둔다.
    // monthlyReportCsv.ts 의 수술 그룹 순서와 반드시 같아야 한다(화면과 CSV가 어긋나면 대조가 꼬인다).
    { group: '수술', id: 'surgery-total', label: '총 수술수', chart: { title: '총 수술수', series: 'totalSurgery' } },
    { group: '수술', id: 'surgery-cataract', label: '백내장 수술', chart: { title: '백내장 수술', series: 'cataractSurgery' } },
    { group: '수술', id: 'surgery-vision', label: '시력교정 수술', chart: { title: '시력교정 수술', series: 'visionSurgery' } },
    { group: '수술', id: 'surgery-reop', label: '재수술 (레이저+렌즈)', chart: { title: '재수술', suffix: '(레이저+렌즈)', series: 'reoperation' } },
    { group: '수술', id: 'surgery-detail', label: '수술 상세표', node: <ReportSurgeryTable dataMap={s.surgeryDataMap} /> },
    { group: '외래', id: 'outpatient', label: '외래수', chart: { title: '외래수', series: 'outpatient' } },
  ]
}
