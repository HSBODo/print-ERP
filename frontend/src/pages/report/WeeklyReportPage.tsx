import { useMemo, useState } from 'react'
import { Printer } from 'lucide-react'
import { ReportWeekLineChart } from '@/components/report/ReportWeekLineChart'
import { weeksOfYear, weeksOfMonth } from '@/components/report/reportWeeks'
import { Select } from '@/components/filters/Select'
import { useWeeklyReport } from '@/hooks/report/useWeeklyReport'
import { CURRENT_YEAR, MONTHS } from '@/constants/chart'
import { YEARS } from './monthlyReportUtils'
import { useReportSeries } from './useReportSeries'
import { buildReportItems } from './reportItems'
import { buildWeeklySeries } from './weeklyReportSeries'
import { ReportShell, type ShellReportItem } from './ReportShell'

/**
 * 주차 레포트 — 월간 레포트와 **같은 도표 목록**을 ISO 8601 연간 주차 축으로 본다.
 *
 * 범위(툴바): 전체 = 그 해 52/53주 전부 · 월 선택 = 그 달에 걸친 주차(월 경계 주차 포함).
 *
 * 주차 값은 `/api/report/weekly` 의 운영 DB 일별 집계를 주로 묶은 것이라 **전 구간 라이브**다.
 * 월간 레포트의 2024·2025 는 레거시 확정값(월 단위)이라 주로 쪼갤 수 없어, 같은 달이라도
 * 두 화면 값이 미세하게 다를 수 있다(주간 검사자 종합지표와 같은 성격).
 *
 * 주차로 분해되지 않는 4개 도표(고객분류별 검사수·상담성공률·중단 사유·수술 상세표)는
 * 월 기준 그대로 보여주고 목차·본문에 '월' 표시를 단다.
 */

/** 주차 범위 셀렉트: 0 = 전체, 1~12 = 해당 월 */
const ALL_SCOPE = 0

export function WeeklyReportPage() {
  // 월 기준 도표 4종(고객분류별·상담성공률·중단사유·수술상세표)은 월간 레포트와 같은 소스를 쓴다.
  const monthly = useReportSeries()
  const weekly = useWeeklyReport(YEARS)

  const [weekScope, setWeekScope] = useState(ALL_SCOPE)
  const yearWeeks = useMemo(() => weeksOfYear(CURRENT_YEAR), [])
  const weeks = useMemo(
    () => (weekScope === ALL_SCOPE ? yearWeeks : weeksOfMonth(yearWeeks, weekScope)),
    [yearWeeks, weekScope],
  )

  const scopeOptions = [
    { value: ALL_SCOPE, label: `전체 (${yearWeeks.length}주)` },
    ...MONTHS.map((m, i) => ({ value: i + 1, label: m })),
  ]

  const weekCharts = useMemo(
    () => buildWeeklySeries(weekly.items, weeks, YEARS),
    [weekly.items, weeks],
  )

  const [stopReasonMonth, setStopReasonMonth] = useState<number | null>(null)
  const activeStopReasonMonth =
    stopReasonMonth ?? (weekScope === ALL_SCOPE ? monthly.latestMonthIdx + 1 : weekScope)

  const items = buildReportItems(monthly, {
    stopReasonMonth: activeStopReasonMonth,
    onStopReasonMonthChange: setStopReasonMonth,
  })

  const monthOnlyBadge = (
    <span className="ml-auto shrink-0 rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-700">월</span>
  )
  const monthOnlyNote = (
    <p className="report-no-print mb-1 text-[11px] font-semibold text-amber-700">
      ※ 이 도표는 주차로 분해되지 않아 월 기준으로 표시합니다.
    </p>
  )

  const shellItems: ShellReportItem[] = items.map((it) => ({
    group: it.group,
    id: it.id,
    label: it.label,
    badge: it.chart ? undefined : monthOnlyBadge,
    note: it.chart ? undefined : monthOnlyNote,
    node: it.chart
      ? <ReportWeekLineChart
          title={it.chart.title}
          suffix={it.chart.suffix}
          format={it.chart.format}
          percentFractionDigits={it.chart.percentFractionDigits}
          yDomain={it.chart.yDomain}
          years={it.chart.years ?? YEARS}
          weeks={weeks}
          data={weekCharts[it.chart.series] ?? {}}
        />
      : it.node,
  }))

  const first = weeks[0]
  const last = weeks[weeks.length - 1]
  const rangeLabel = !first
    ? `${CURRENT_YEAR}년`
    : weekScope === ALL_SCOPE
      ? `${CURRENT_YEAR}년 1~${last.week}주`
      : `${CURRENT_YEAR}년 ${weekScope}월 포함 ${first.week}~${last.week}주 (${first.rangeLabel} ~ ${last.rangeLabel})`

  return (
    <ReportShell
      title="주차 레포트"
      subtitle={
        <>
          {rangeLabel} · ISO 주차(월~일) · 당해연도({CURRENT_YEAR})·전년도({CURRENT_YEAR - 1})·전전년도({CURRENT_YEAR - 2}) 주차 번호 비교
        </>
      }
      actions={
        <>
          <Select value={weekScope} onChange={setWeekScope} options={scopeOptions} title="주차 범위" />
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-md bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-700"
          >
            <Printer className="h-4 w-4" />
            PDF로 저장
          </button>
        </>
      }
      banner={
        weekly.isError ? (
          <div className="rounded-md border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-900">
            주차 집계를 불러오지 못했습니다. 운영 DB 연결(mssql/postgres-mart 프로파일)을 확인하세요.
          </div>
        ) : (
          <div className="rounded-md border border-border/70 bg-muted/40 px-4 py-2.5 text-[13px] text-muted-foreground">
            주차 값은 <b className="text-foreground">운영 DB 일별 집계</b>를 ISO 주차(월~일)로 묶은 라이브 수치입니다.
            월간 레포트의 2024·2025 는 레거시 확정값(월 단위)이라 주로 쪼갤 수 없어, 같은 달이라도 두 화면 합계가 미세하게 다를 수 있습니다.
          </div>
        )
      }
      items={shellItems}
      isLoading={weekly.isLoading || monthly.isLoading}
    />
  )
}
