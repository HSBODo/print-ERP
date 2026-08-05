import type { ReportWeek } from '@/components/report/reportWeeks'
import type { WeeklySeries } from './weeklyReportSeries'

/**
 * 주차 레포트 도표 데이터를 세로형 CSV로 직렬화.
 * 행 = (지표 × 연도), 열 = 화면에 보이는 주차(전체면 01~52/53주차, 월 선택이면 그 달에 걸친 주차).
 *
 * 월간 CSV(monthlyReportCsv)와 같은 shape 이되 열이 월 → 주차로 바뀐 것이다.
 * 주차로 분해되지 않는 도표 4종(고객분류별 검사수·상담성공률·중단 사유·수술 상세표)은
 * 주차 열에 채울 값이 없어 제외한다 — 그 값이 필요하면 월간 레포트 CSV 를 쓴다.
 */

/** 화면 목차(buildReportItems) 순서를 그대로 따르는 행 정의. */
export interface WeeklyCsvRowSpec {
  group: string
  label: string
  /** weekCharts 의 키 */
  series: string
  /** 'percent' 면 % 단위 */
  format?: 'percent'
  /** % 표시 소수 자릿수(미지정 시 정수 반올림) */
  fractionDigits?: number
}

export interface WeeklyReportCsvInput {
  years: number[]
  weeks: ReportWeek[]
  /** buildWeeklySeries 결과 (series → year → 주차 배열) */
  charts: Partial<Record<string, WeeklySeries>>
  rows: WeeklyCsvRowSpec[]
}

const escapeCell = (value: string | number): string => {
  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** 비율은 화면 차트와 동일하게 기본 정수 반올림, fractionDigits 가 있으면 그 자릿수. 건수는 원값, null 은 빈칸. */
const formatValue = (
  value: number | null | undefined,
  unit: '건' | '%',
  fractionDigits?: number,
): string => {
  if (value === null || value === undefined) return ''
  if (unit !== '%') return String(value)
  return typeof fractionDigits === 'number' ? value.toFixed(fractionDigits) : String(Math.round(value))
}

/** 주차 레포트를 세로형 CSV 문자열로 만든다(BOM 미포함, CRLF 구분). */
export function buildWeeklyReportCsv({ years, weeks, charts, rows }: WeeklyReportCsvInput): string {
  const sortedYears = [...years].sort((a, b) => a - b)
  const weekHeaders = weeks.map((w) => `${pad2(w.week)}주차`)

  const lines: string[] = [
    ['그룹', '지표', '단위', '연도', ...weekHeaders].map(escapeCell).join(','),
  ]

  for (const spec of rows) {
    const byYear = charts[spec.series]
    if (!byYear) continue
    const unit: '건' | '%' = spec.format === 'percent' ? '%' : '건'
    for (const year of sortedYears) {
      const values = byYear[year] ?? []
      lines.push(
        [
          spec.group,
          spec.label,
          unit,
          year,
          ...weeks.map((_, i) => formatValue(values[i], unit, spec.fractionDigits)),
        ]
          .map(escapeCell)
          .join(','),
      )
    }
  }

  return lines.join('\r\n')
}
