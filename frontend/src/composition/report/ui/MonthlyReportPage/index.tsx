import { Download, Printer } from 'lucide-react'
import { useState } from 'react'

import { useEventNotesByYears } from '#domain/core/eventNote/hooks/useEventNotesByYears'
import { EventNoteDetailPanel } from '#domain/core/eventNote/ui/EventNoteDetailPanel'
import { CURRENT_YEAR } from '#shared/constants/chart'
import { yearColorsOf } from '#shared/ui/YearCompare/useYearCompare'

import { useReportSeries } from '../../hooks/useReportSeries'
import { buildMonthlyReportCsv } from '../../utils/monthlyReportCsv'
import { YEARS } from '../../utils/monthlyReportUtils'
import { buildReportItems } from '../../utils/reportItems'
import { ReportLineChart } from '../ReportLineChart'
import { ReportShell, type ShellReportItem } from '../ReportShell'

export function MonthlyReportPage() {
  const series = useReportSeries()
  const { charts, latestMonthIdx } = series

  const periodLabel = `${CURRENT_YEAR}년 ${latestMonthIdx + 1}월`
  const [stopReasonMonth, setStopReasonMonth] = useState<number | null>(null)
  const eventNotes = useEventNotesByYears(YEARS)
  /** 마지막으로 가리킨 달(어느 도표든) — 오른쪽 이벤트 패널이 보여 준다 */
  const [activeMonth, setActiveMonth] = useState<number>()
  const activeStopReasonMonth = stopReasonMonth ?? latestMonthIdx + 1

  // weeklyOnly 항목(드림렌즈 신규/FU)은 월간 대응 데이터가 없어 여기서 제외한다.
  const items = buildReportItems(series, {
    stopReasonMonth: activeStopReasonMonth,
    onStopReasonMonthChange: setStopReasonMonth,
  }).filter((it) => !it.weeklyOnly)

  const shellItems: ShellReportItem[] = items.map((it) => ({
    group: it.group,
    id: it.id,
    label: it.label,
    node: it.chart ? (
      <ReportLineChart
        title={it.chart.title}
        suffix={it.chart.suffix}
        format={it.chart.format}
        percentDigits={it.chart.percentFractionDigits}
        years={it.chart.years ?? YEARS}
        data={charts[it.chart.series]}
        annotations={eventNotes.monthLabels}
        onActiveMonthChange={setActiveMonth}
      />
    ) : (
      it.node
    ),
  }))

  // CSV 다운로드 연도 선택 팝업
  const [csvOpen, setCsvOpen] = useState(false)
  const [csvScope, setCsvScope] = useState<'all' | number>('all')
  const csvYearOptions: { value: 'all' | number; label: string }[] = [
    { value: 'all', label: '전체' },
    ...[...YEARS]
      .sort((a, b) => a - b)
      .map((year) => ({ value: year, label: `${year}년` })),
  ]

  const handleDownloadCsv = (scope: 'all' | number) => {
    const selectedYears = scope === 'all' ? YEARS : [scope]
    const csv = buildMonthlyReportCsv({
      years: selectedYears,
      charts: charts,
      currentYear: CURRENT_YEAR,
      success: {
        all: charts.successAll[CURRENT_YEAR] ?? [],
        oneday: charts.successOneday[CURRENT_YEAR] ?? [],
        general: charts.successGeneral[CURRENT_YEAR] ?? [],
      },
      stopReasonByMonth: series.stopReasonDataMap[CURRENT_YEAR] ?? [],
      stopReasonMonth: activeStopReasonMonth,
    })
    // Excel 한글 보존을 위해 UTF-8 BOM 선두 부착
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `월간레포트_${scope === 'all' ? '전체' : scope}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setCsvOpen(false)
  }

  return (
    <>
      <ReportShell
        title="월간 레포트"
        subtitle={
          <>
            {periodLabel} 기준 · 당해연도({CURRENT_YEAR})·전년도(
            {CURRENT_YEAR - 1})·전전년도({CURRENT_YEAR - 2}) 3개년 비교
            {series.lastBatchDate && ` · ${series.lastBatchDate} 데이터 반영`}
          </>
        }
        actions={
          <>
            <button
              type="button"
              onClick={() => setCsvOpen(true)}
              disabled={series.isLoading}
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
        items={shellItems}
        isLoading={series.isLoading}
        aside={
          <EventNoteDetailPanel
            notes={eventNotes.notes}
            monthIndex={activeMonth}
            yearColors={yearColorsOf(YEARS)}
            className="w-full"
          />
        }
      />

      {csvOpen && (
        <div
          className="report-no-print fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="CSV 다운로드 연도 선택"
          onClick={() => setCsvOpen(false)}
        >
          <div
            className="w-full max-w-xs rounded-lg border border-border/70 bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="text-base font-bold text-foreground">
              CSV 다운로드
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              내려받을 연도를 선택하세요.
            </p>
            <div className="mt-4 space-y-1.5">
              {csvYearOptions.map((opt) => (
                <label
                  key={String(opt.value)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border/70 px-3 py-2 text-sm transition-colors hover:bg-gray-50 has-[:checked]:border-blue-400 has-[:checked]:bg-blue-50"
                >
                  <input
                    type="radio"
                    name="csv-year"
                    className="accent-blue-600"
                    checked={csvScope === opt.value}
                    onChange={() => setCsvScope(opt.value)}
                  />
                  <span className="font-medium text-gray-800">{opt.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCsvOpen(false)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => handleDownloadCsv(csvScope)}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                <Download className="h-4 w-4" />
                다운로드
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
