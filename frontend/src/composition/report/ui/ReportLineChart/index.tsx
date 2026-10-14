import { Card, CardContent, CardHeader, CardTitle } from '#shared/ui/Card'
import { YearCompare } from '#shared/ui/YearCompare'
import type { ChartMonthLabel } from '#shared/ui/YearCompare/type'
import { useYearCompare } from '#shared/ui/YearCompare/useYearCompare'

export interface ReportLineChartProps {
  title: string
  /** 제목 옆 작은 부제 (예: "(소개 제외)") */
  suffix?: string
  years: number[]
  /** year → 12개월 값 배열 (없는 달은 null) */
  data: Record<number, (number | null)[]>
  format?: 'percent'
  /** 비율 소수 자릿수 — 레포트는 정수가 기본 (월간보고 PDF 와 같게) */
  percentDigits?: number
  /** 이벤트 노트 깃발·툴팁 */
  annotations?: ChartMonthLabel[]
  /** 가리킨 달(0 = 1월) — 레포트 옆 이벤트 패널용 */
  onActiveMonthChange?: (monthIndex: number) => void
}

/**
 * 월간 레포트 연도 비교 도표 — 차트·표는 YearCompare 공용 부품, 레포트는 머리(가운데 제목)와 인쇄 틀만 맡는다.
 * 인쇄(PDF)에서 도표 1개 = 1페이지가 되도록 `report-chart` 를 단다 (index.css).
 */
export function ReportLineChart({
  title,
  suffix,
  years,
  data,
  format,
  percentDigits = 0,
  annotations,
  onActiveMonthChange,
}: ReportLineChartProps) {
  const yearCompare = useYearCompare(
    years,
    (year, monthIndex) => data[year]?.[monthIndex],
  )
  const chartFormat = format ?? 'count'

  return (
    <Card className="report-chart flex break-inside-avoid flex-col border-border/70 shadow-sm">
      <CardHeader className="items-center pb-2">
        <CardTitle className="text-center text-lg">
          {title}
          {suffix && (
            <span className="text-sm font-medium text-muted-foreground">
              {' '}
              {suffix}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <YearCompare.Chart
          {...yearCompare}
          format={chartFormat}
          percentDigits={percentDigits}
          annotations={annotations}
          onActiveMonthChange={onActiveMonthChange}
          className="h-128 flex-none"
        />
        <YearCompare.Table
          {...yearCompare}
          format={chartFormat}
          percentDigits={percentDigits}
        />
      </CardContent>
    </Card>
  )
}
