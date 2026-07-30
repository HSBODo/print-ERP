import { useMemo, useState } from 'react'
import { Printer } from 'lucide-react'
import { ReportWeekLineChart } from '@/components/report/ReportWeekLineChart'
import { weeksOfYear, weeksOfMonth, monthlyToWeekly } from '@/components/report/reportWeeks'
import { Select } from '@/components/filters/Select'
import { CURRENT_YEAR, MONTHS } from '@/constants/chart'
import { YEARS, PERCENT_SERIES_KEYS } from './monthlyReportUtils'
import { useReportSeries, type MonthlySeries } from './useReportSeries'
import { buildReportItems } from './reportItems'
import { ReportShell, type ShellReportItem } from './ReportShell'

/**
 * 주차 레포트 — 월간 레포트와 **같은 도표 목록**을 주차축으로 본다.
 *
 * 범위(툴바): 전체 = 그 해 52/53주 전부 · 월 선택 = 그 달에 걸친 주차(월 경계 주차 포함).
 *
 * ⚠️ 주차 집계 API 연동 전이라 값은 월 데이터를 일수 비례로 임시 분배한 것이다
 *    (점선 + 배너로 표시). 연동 시 `weekCharts` 만 API 응답으로 교체하면 된다.
 */

/** 주차 범위 셀렉트: 0 = 전체, 1~12 = 해당 월 */
const ALL_SCOPE = 0

export function WeeklyReportPage() {
  const series = useReportSeries()
  const { charts, latestMonthIdx } = series

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

  // 월별 시리즈 → 주차 시리즈 (임시 분배). 비율(%)은 일수 가중평균, 건수는 일수 비례 배분.
  const weekCharts = useMemo(() => {
    const out: Record<string, MonthlySeries> = {}
    for (const [key, byYear] of Object.entries(charts)) {
      out[key] = monthlyToWeekly(byYear, weeks, PERCENT_SERIES_KEYS.has(key) ? 'avg' : 'sum')
    }
    return out
  }, [charts, weeks])

  const [stopReasonMonth, setStopReasonMonth] = useState<number | null>(null)
  const activeStopReasonMonth =
    stopReasonMonth ?? (weekScope === ALL_SCOPE ? latestMonthIdx + 1 : weekScope)

  const items = buildReportItems(series, {
    stopReasonMonth: activeStopReasonMonth,
    onStopReasonMonthChange: setStopReasonMonth,
  })

  const monthOnlyBadge = (
    <span className="ml-auto shrink-0 rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-700">월</span>
  )
  const monthOnlyNote = (
    <p className="report-no-print mb-1 text-[11px] font-semibold text-amber-700">
      ※ 이 도표는 월 기준으로만 제공됩니다.
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
          provisional
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
          {rangeLabel} · 당해연도({CURRENT_YEAR})·전년도({CURRENT_YEAR - 1})·전전년도({CURRENT_YEAR - 2}) 3개년 비교
          {series.lastBatchDate && ` · ${series.lastBatchDate} 데이터 반영`}
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
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
          <b>주차 레포트 — UI 미리보기</b> · 주차 값은 월 데이터를 <b>일수 비례로 임시 분배</b>한 값입니다(점선 표시).
          실제 주차 집계 API 연동 전이므로 수치는 참고용입니다.
        </div>
      }
      items={shellItems}
      isLoading={series.isLoading}
    />
  )
}
