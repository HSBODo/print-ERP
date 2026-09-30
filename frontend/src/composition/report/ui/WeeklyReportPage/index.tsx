import { Download, Printer } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useWeeklyReport } from '#domain/core/report/hooks/useWeeklyReport'
import { CURRENT_YEAR, MONTHS } from '#shared/constants/chart'
import { Select } from '#shared/ui/Select'
import { downloadCsv } from '#shared/utils/csv'

import { useReportSeries } from '../../hooks/useReportSeries'
import { YEARS } from '../../utils/monthlyReportUtils'
import { buildReportItems } from '../../utils/reportItems'
import { weeksOfMonth, weeksOfYear } from '../../utils/reportWeeks'
import {
  buildWeeklyReportCsv,
  type WeeklyCsvRowSpec,
} from '../../utils/weeklyReportCsv'
import { buildWeeklySeries } from '../../utils/weeklyReportSeries'
import { ReportShell, type ShellReportItem } from '../ReportShell'
import { ReportWeekLineChart } from '../ReportWeekLineChart'

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
    () =>
      weekScope === ALL_SCOPE ? yearWeeks : weeksOfMonth(yearWeeks, weekScope),
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
    stopReasonMonth ??
    (weekScope === ALL_SCOPE ? monthly.latestMonthIdx + 1 : weekScope)

  // 중단율 도표의 비교 연도는 **주차 집계** 기준으로 고른다.
  // buildReportItems 기본값(monthly.stopRateYears)은 월간 마트에 중단수가 있는 연도라,
  // 마트에 없고 주차 라이브에만 있는 연도(24·25)의 비교선이 통째로 빠진다.
  const weeklyStopRateYears = useMemo(
    () =>
      YEARS.filter((year) =>
        weekCharts.stopRate?.[year]?.some((v) => typeof v === 'number'),
      ),
    [weekCharts],
  )

  const items = buildReportItems(
    {
      ...monthly,
      stopRateYears: weeklyStopRateYears.length
        ? weeklyStopRateYears
        : monthly.stopRateYears,
    },
    {
      stopReasonMonth: activeStopReasonMonth,
      onStopReasonMonthChange: setStopReasonMonth,
    },
  )

  const monthOnlyBadge = (
    <span className="ml-auto shrink-0 rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-700">
      월
    </span>
  )
  // 인쇄에도 남긴다 — 목차 '월' 뱃지는 인쇄 영역 밖이라, 이 문구가 없으면 PDF 에서
  // 월 기준 도표 4종이 주차 도표와 구분되지 않는다.
  const monthOnlyNote = (
    <p className="mb-1 text-[11px] font-semibold text-amber-700">
      ※ 이 도표는 주차로 분해되지 않아 월 기준으로 표시합니다.
    </p>
  )

  const shellItems: ShellReportItem[] = items.map((it) => ({
    group: it.group,
    id: it.id,
    label: it.label,
    badge: it.chart ? undefined : monthOnlyBadge,
    note: it.chart ? undefined : monthOnlyNote,
    node: it.chart ? (
      <ReportWeekLineChart
        title={it.chart.title}
        suffix={it.chart.suffix}
        format={it.chart.format}
        percentFractionDigits={it.chart.percentFractionDigits}
        /* yDomain 은 월간 값 기준(예약 종합 800~3000)이라 주차(168~608)에는 쓰지 않는다.
             그대로 넘기면 데이터가 축 하단 밖으로 밀려 선이 바닥에 붙는다 — 자동 스케일로 둔다. */
        years={it.chart.years ?? YEARS}
        weeks={weeks}
        data={weekCharts[it.chart.series] ?? {}}
        singleTable
      />
    ) : (
      it.node
    ),
  }))

  // CSV — 화면 목차 순서 그대로, 주차로 분해되는 도표(chart 있는 항목)만 담는다.
  // 월 기준 도표 4종은 주차 열에 채울 값이 없어 제외(월간 레포트 CSV 를 쓸 것).
  const handleDownloadCsv = () => {
    const rows: WeeklyCsvRowSpec[] = items
      .filter((it) => it.chart)
      .map((it) => ({
        group: it.group,
        label: it.label,
        series: it.chart!.series,
        format: it.chart!.format,
        fractionDigits: it.chart!.percentFractionDigits,
      }))
    const csv = buildWeeklyReportCsv({
      years: YEARS,
      weeks,
      charts: weekCharts,
      rows,
    })
    const scope =
      weekScope === ALL_SCOPE
        ? `전체_${String(weeks[0]?.week ?? 1).padStart(2, '0')}-${weeks[weeks.length - 1]?.week ?? ''}주차`
        : `${weekScope}월`
    downloadCsv(`주차레포트_${CURRENT_YEAR}_${scope}.csv`, csv)
  }

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
          {rangeLabel} · ISO 주차(월~일) · 당해연도({CURRENT_YEAR})·전년도(
          {CURRENT_YEAR - 1})·전전년도({CURRENT_YEAR - 2}) 주차 번호 비교
        </>
      }
      actions={
        <>
          <Select
            value={weekScope}
            onChange={setWeekScope}
            options={scopeOptions}
            title="주차 범위"
          />
          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={weekly.isLoading || !weeks.length}
            title="화면에 보이는 주차 범위를 CSV로 내려받기"
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
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
        <div className="space-y-2">
          {weekly.isError ? (
            <div className="rounded-md border border-red-300 bg-red-50 px-4 py-2.5 text-sm text-red-900">
              주차 집계를 불러오지 못했습니다. 마트 연결 상태를 확인하세요.
            </div>
          ) : (
            <div className="rounded-md border border-border/70 bg-muted/40 px-4 py-2.5 text-[13px] text-muted-foreground">
              주차 값은{' '}
              <b className="text-foreground">
                배치 적재 마트(운영 DB 일별 → ISO 주차)
              </b>
              를 조회한 수치입니다. 월간 레포트의 2024·2025 는 레거시 확정값(월
              단위)이라 주로 쪼갤 수 없어, 같은 달이라도 두 화면 합계가 미세하게
              다를 수 있습니다.
            </div>
          )}
        </div>
      }
      items={shellItems}
      isLoading={weekly.isLoading || monthly.isLoading}
    />
  )
}
