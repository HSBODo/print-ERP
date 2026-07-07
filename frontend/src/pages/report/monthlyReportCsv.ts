import { MONTHS } from '@/constants/chart'
import type { StopReasonMonthlyItem } from '@/api/consultation'

/**
 * 월간 레포트 도표 데이터를 세로형 CSV로 직렬화 (수술 상세표 #27 제외).
 * 화면 charts 객체를 그대로 사용 — 행 = (지표 × 연도), 열 = 1~12월.
 */

type YearSeries = Record<number, Array<number | null>>

/**
 * 출력 순서 = 화면 LNB 목차(MonthlyReportPage의 items) 순서.
 * series = 연도별 차트, success/stopReason = 당해연도 전용 블록(목차 위치에 끼워 넣음).
 */
type RowSpec =
  | { type: 'series'; group: string; label: string; unit: '건' | '%'; key: string; fractionDigits?: number }
  | { type: 'success' }
  | { type: 'stopReason' }

const ROWS: RowSpec[] = [
  { type: 'series', group: '예약', label: '예약 종합(콜+온라인)', unit: '건', key: 'reservations' },
  { type: 'series', group: '예약', label: '콜 예약', unit: '건', key: 'call' },
  { type: 'series', group: '예약', label: '온라인 예약', unit: '건', key: 'online' },
  { type: 'series', group: '검사유입', label: '일반고객 검사', unit: '건', key: 'examGeneralCustomer' },
  { type: 'series', group: '검사유입', label: '고객소개 검사', unit: '건', key: 'examReferralCustomer' },
  { type: 'series', group: '검사유입', label: '직원소개 검사', unit: '건', key: 'examReferralStaff' },
  { type: 'series', group: '검사유입', label: '직장인 검사', unit: '건', key: 'examWorker' },
  { type: 'series', group: '검사유입', label: '학생 검사', unit: '건', key: 'examStudent' },
  { type: 'series', group: '검사유입', label: '기타 검사', unit: '건', key: 'examEtc' },
  { type: 'series', group: '검사수', label: '백내장 검사수', unit: '건', key: 'cataractExam' },
  { type: 'series', group: '검사수', label: '시력교정 검사', unit: '건', key: 'visionExam' },
  { type: 'series', group: '검사수', label: '검사수(전체)', unit: '건', key: 'examCount' },
  { type: 'series', group: '검사수', label: '원데이 검사', unit: '건', key: 'oneDayExam' },
  { type: 'series', group: '검사수', label: '일반 검사', unit: '건', key: 'examGeneral' },
  { type: 'series', group: '비율', label: '일반검사 비율', unit: '%', key: 'ratioGeneral' },
  { type: 'series', group: '비율', label: '백내장 예약률', unit: '%', key: 'cataractRate' },
  { type: 'series', group: '비율', label: '시력교정 예약률', unit: '%', key: 'visionRate' },
  { type: 'series', group: '비율', label: '시력교정 일반예약률', unit: '%', key: 'rateVisionGeneral' },
  { type: 'series', group: '비율', label: '원데이 예약률', unit: '%', key: 'rateOneday' },
  { type: 'success' },
  { type: 'series', group: '중단', label: '중단율', unit: '%', key: 'stopRate', fractionDigits: 1 },
  { type: 'stopReason' },
  { type: 'series', group: '수술', label: '백내장 수술', unit: '건', key: 'cataractSurgery' },
  { type: 'series', group: '수술', label: '시력교정 수술', unit: '건', key: 'visionSurgery' },
  { type: 'series', group: '수술', label: '총 수술수', unit: '건', key: 'totalSurgery' },
  { type: 'series', group: '외래', label: '외래수', unit: '건', key: 'outpatient' },
]

const STOP_REASONS: { label: string; key: keyof StopReasonMonthlyItem }[] = [
  { label: '중단사유-수술권유X', key: 'recommendX' },
  { label: '중단사유-렌즈삽입불가', key: 'lensImpossible' },
  { label: '중단사유-원추각막', key: 'keratoconus' },
  { label: '중단사유-아벨리노', key: 'avellino' },
  { label: '중단사유-녹내장', key: 'glaucoma' },
  { label: '중단사유-시력변화', key: 'visionChange' },
  { label: '중단사유-기타', key: 'other' },
  { label: '중단사유-합계', key: 'total' },
]

const escapeCell = (value: string | number): string => {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/**
 * 비율은 화면 차트와 동일하게 기본 정수 반올림(Math.round), 지표별 fractionDigits가 있으면 그 자릿수로 표시.
 * 건수는 원값, null은 빈칸.
 */
const formatValue = (value: number | null | undefined, unit: '건' | '%', fractionDigits?: number): string => {
  if (value === null || value === undefined) return ''
  if (unit !== '%') return String(value)
  return typeof fractionDigits === 'number' ? value.toFixed(fractionDigits) : String(Math.round(value))
}

export interface MonthlyReportCsvInput {
  years: number[]
  /** MonthlyReportPage의 charts 객체. SERIES 키만 읽으므로 unknown으로 받는다. */
  charts: Record<string, unknown>
  /** 당해연도(상담성공률·중단사유는 당해연도만 존재). */
  currentYear: number
  success: {
    all: Array<number | null>
    oneday: Array<number | null>
    general: Array<number | null>
  }
  /** 당해연도 12개월 중단 사유(없는 달은 null). */
  stopReasonByMonth: Array<StopReasonMonthlyItem | null>
}

/** 월간 레포트 전 도표(#27 제외)를 세로형 CSV 문자열로 만든다(BOM 미포함). */
export function buildMonthlyReportCsv({
  years,
  charts,
  currentYear,
  success,
  stopReasonByMonth,
}: MonthlyReportCsvInput): string {
  const sortedYears = [...years].sort((a, b) => a - b)
  const lines: string[] = [['그룹', '지표', '단위', '연도', ...MONTHS].map(escapeCell).join(',')]

  const pushRow = (
    group: string,
    label: string,
    unit: '건' | '%',
    year: number,
    values: Array<number | null>,
    fractionDigits?: number,
  ) => {
    lines.push(
      [group, label, unit, year, ...MONTHS.map((_, i) => formatValue(values[i], unit, fractionDigits))]
        .map(escapeCell)
        .join(','),
    )
  }

  // 상담성공률·중단사유는 당해연도만 존재 → 선택 범위에 당해연도가 있을 때만 포함
  const includeCurrentYear = sortedYears.includes(currentYear)

  for (const spec of ROWS) {
    if (spec.type === 'series') {
      const byYear = charts[spec.key] as YearSeries | undefined
      if (!byYear) continue
      for (const year of sortedYears) {
        pushRow(spec.group, spec.label, spec.unit, year, byYear[year] ?? [], spec.fractionDigits)
      }
    } else if (spec.type === 'success') {
      if (!includeCurrentYear) continue
      pushRow('전환&성공', '상담성공률(전체)', '%', currentYear, success.all)
      pushRow('전환&성공', '상담성공률(원데이)', '%', currentYear, success.oneday)
      pushRow('전환&성공', '상담성공률(일반)', '%', currentYear, success.general)
    } else {
      if (!includeCurrentYear) continue
      for (const reason of STOP_REASONS) {
        const values = stopReasonByMonth.map((item) => (item ? (item[reason.key] as number) : null))
        pushRow('중단', reason.label, '건', currentYear, values)
      }
    }
  }

  return lines.join('\r\n')
}
