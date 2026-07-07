import { useMemo, useState, Fragment, type ReactNode } from 'react'
import { Download, Printer } from 'lucide-react'
import { ReportLineChart } from '@/components/report/ReportLineChart'
import { useReservationOverallTrend } from '@/hooks/reservation/useReservationOverallTrend'
import { useOutpatientCountTrend } from '@/hooks/outpatient/useOutpatientCountTrend'
import { useProcedureExamTrend } from '@/hooks/exam/useProcedureExamTrend'
import { useExaminationTrend } from '@/hooks/exam/useExaminationTrend'
import { useSurgeryTrend } from '@/hooks/surgery/useSurgeryTrend'
import { useCataractReservationRateTrend } from '@/hooks/consultation/useCataractReservationRateTrend'
import { useStopReasonMonthly } from '@/hooks/consultation/useStopReasonMonthly'
import { useOverallExamWeekly } from '@/hooks/overall/useOverallExamWeekly'
import { useConsultationRateTrend } from '@/hooks/consultation/useConsultationRateTrend'
import { MONTHLY_LEGACY_CHARTS, MONTHLY_REPORT_PDF_2026_CHARTS } from '@/data/monthlyReportLegacy'
import { CURRENT_YEAR } from '@/constants/chart'
import {
  StopReasonBar,
  ReportSurgeryTable,
  ReportSuccessRateChart,
  ReportChartSkeleton,
} from './MonthlyReportCharts'
import {
  YEARS,
  applyCurrentYearBase,
  isIncompleteMonth,
  mergeMonthlySeries,
  VISION_RATE_LEGACY,
  CATARACT_RATE_LEGACY,
  type OverallMonthSums,
} from './monthlyReportUtils'
import { buildMonthlyReportCsv } from './monthlyReportCsv'

export function MonthlyReportPage() {
  const resv = useReservationOverallTrend(YEARS)
  const outpatient = useOutpatientCountTrend(YEARS)
  const procedure = useProcedureExamTrend(YEARS)
  const exam = useExaminationTrend(YEARS)
  const surgery = useSurgeryTrend(YEARS)
  const stopReason = useStopReasonMonthly([CURRENT_YEAR])
  const visionRate = useCataractReservationRateTrend([CURRENT_YEAR], 'vision')
  const cataractRate = useCataractReservationRateTrend([CURRENT_YEAR], 'cataract')
  const overall = useOverallExamWeekly([CURRENT_YEAR])
  const consult = useConsultationRateTrend(YEARS) // 시력교정 상담성공률(전체) — 3개년 라이브

  // 당해연도 주간 항목을 월(1~12)별로 합산 — 검사유입·세그먼트 도표의 라이브 분모분자
  const overallMonthly = useMemo(() => {
    const acc: Record<number, OverallMonthSums> = {}
    for (const it of overall.items) {
      if (it.year !== CURRENT_YEAR) continue
      const s = acc[it.month] ?? {
        introGeneral: 0, introCustomer: 0, introStaff: 0,
        jobOffice: 0, jobStudent: 0, jobEtc: 0,
        visionExam: 0, oneDay: 0, visionBooked: 0, oneDayBooked: 0, stopCount: 0,
      }
      s.introGeneral += it.introGeneral
      s.introCustomer += it.introCustomer
      s.introStaff += it.introStaff
      s.jobOffice += it.jobOffice
      s.jobStudent += it.jobStudent
      s.jobEtc += it.jobEtc
      s.visionExam += it.visionExam
      s.oneDay += it.oneDay
      s.visionBooked += it.visionBooked
      s.oneDayBooked += it.oneDayBooked
      s.stopCount += it.stopCount
      acc[it.month] = s
    }
    return acc
  }, [overall.items])

  const charts = useMemo(() => {
    // 연도별 12개월 배열 빌더 — 미래월은 null(선 끊김)
    const build = (pick: (year: number, i: number) => number | null | undefined): Record<number, (number | null)[]> => {
      const out: Record<number, (number | null)[]> = {}
      YEARS.forEach((y) => {
        out[y] = Array.from({ length: 12 }, (_, i) => {
          if (isIncompleteMonth(y, i)) return null
          const v = pick(y, i)
          return typeof v === 'number' ? v : null
        })
      })
      return out
    }

    const withPdfBase = (
      chartKey: string,
      data: Record<number, (number | null)[]>,
    ): Record<number, (number | null)[]> =>
      applyCurrentYearBase(
        data,
        CURRENT_YEAR,
        CURRENT_YEAR === 2026 ? MONTHLY_REPORT_PDF_2026_CHARTS[chartKey] : undefined,
      )

    // 예약률: 2024·2025 확정값 + 2026 API
    const rateMap = (
      legacy: Record<number, number[]>,
      pdfKey: string,
      rateData: Record<number, { examCount: number; reservationRate: number }[]>,
    ): Record<number, (number | null)[]> => {
      const out: Record<number, (number | null)[]> = {}
      YEARS.forEach((y) => {
        if (legacy[y]) {
          out[y] = legacy[y]
          return
        }
        out[y] = Array.from({ length: 12 }, (_, i) => {
          if (isIncompleteMonth(y, i)) return null
          const it = rateData[y]?.[i]
          return it && it.examCount ? Math.ceil(it.reservationRate) : null
        })
      })
      return withPdfBase(pdfKey, out)
    }

    // 2024·2025 = 레거시 확정값, 당해연도 = overall-exam/weekly 월합산 라이브
    const liveOrLegacy = (
      legacyKey: string,
      pick: (s: OverallMonthSums) => number | null,
    ): Record<number, (number | null)[]> => {
      const legacy = MONTHLY_LEGACY_CHARTS[legacyKey].data
      const out: Record<number, (number | null)[]> = {}
      YEARS.forEach((y) => {
        if (y !== CURRENT_YEAR) {
          out[y] = legacy[y] ?? Array.from({ length: 12 }, () => null)
          return
        }
        out[y] = Array.from({ length: 12 }, (_, i) => {
          if (isIncompleteMonth(y, i)) return null
          const s = overallMonthly[i + 1]
          return s ? pick(s) : null
        })
      })
      return applyCurrentYearBase(out, CURRENT_YEAR, legacy[CURRENT_YEAR])
    }

    // 당해연도 12개월 단일 시리즈 (consultation 등 외부 dataMap에서 직접) — 미완성월 null
    const curYearSeries = (pick: (i: number) => number | null | undefined): (number | null)[] =>
      Array.from({ length: 12 }, (_, i) => {
        if (isIncompleteMonth(CURRENT_YEAR, i)) return null
        const v = pick(i)
        return typeof v === 'number' && v > 0 ? v : null
      })

    // 2024·2025 = 레거시 확정값, 당해연도 = consultation 라이브
    const consultLiveOrLegacy = (
      legacyKey: string,
      pick: (i: number) => number | null | undefined,
    ): Record<number, (number | null)[]> => {
      const legacy = MONTHLY_LEGACY_CHARTS[legacyKey].data
      const out: Record<number, (number | null)[]> = {}
      YEARS.forEach((y) => {
        out[y] = y !== CURRENT_YEAR
          ? (legacy[y] ?? Array.from({ length: 12 }, () => null))
          : curYearSeries(pick)
      })
      return applyCurrentYearBase(out, CURRENT_YEAR, legacy[CURRENT_YEAR])
    }

    return {
      reservations: withPdfBase('reservations', build((y, i) => resv.dataMap[y]?.[i]?.reservations)),
      call: withPdfBase('call', build((y, i) => resv.dataMap[y]?.[i]?.call)),
      online: withPdfBase('online', build((y, i) => resv.dataMap[y]?.[i]?.online)),
      cataractExam: withPdfBase('cataractExam', build((y, i) => exam.dataMap[y]?.[i]?.cataract)),
      visionExam: withPdfBase('visionExam', build((y, i) => exam.dataMap[y]?.[i]?.visionCorrection)),
      examCount: withPdfBase('examCount', build((y, i) => procedure.dataMap[y]?.[i]?.examCount)),
      oneDayExam: withPdfBase('oneDayExam', build((y, i) => procedure.dataMap[y]?.[i]?.oneDayExamCount)),
      cataractRate: rateMap(CATARACT_RATE_LEGACY, 'cataractRate', cataractRate.dataMap),
      visionRate: rateMap(VISION_RATE_LEGACY, 'visionRate', visionRate.dataMap),
      cataractSurgery: withPdfBase('cataractSurgery', build((y, i) => surgery.dataMap[y]?.[i]?.cataractPatients)),
      visionSurgery: withPdfBase('visionSurgery', build((y, i) => surgery.dataMap[y]?.[i]?.visionPatients)),
      totalSurgery: withPdfBase('totalSurgery', build((y, i) => surgery.dataMap[y]?.[i]?.total)),
      outpatient: withPdfBase('outpatient', build((y, i) => outpatient.dataMap[y]?.[i]?.outpatientCount)),
      // 시력교정 상담성공률(검사중단/수술불가 제외) — 전체/원데이/일반 3계열, 당해연도 라이브 (#21)
      successAll: mergeMonthlySeries(
        CURRENT_YEAR === 2026 ? MONTHLY_REPORT_PDF_2026_CHARTS.successAll : undefined,
        curYearSeries((i) => consult.dataMap[CURRENT_YEAR]?.[i]?.visionConsultation),
      ),
      successOneday: mergeMonthlySeries(
        CURRENT_YEAR === 2026 ? MONTHLY_REPORT_PDF_2026_CHARTS.successOneday : undefined,
        curYearSeries((i) => consult.dataMap[CURRENT_YEAR]?.[i]?.visionConsultationOneday),
      ),
      successGeneral: mergeMonthlySeries(
        CURRENT_YEAR === 2026 ? MONTHLY_REPORT_PDF_2026_CHARTS.successGeneral : undefined,
        curYearSeries((i) => consult.dataMap[CURRENT_YEAR]?.[i]?.visionConsultationGeneral),
      ),
      // 🟢 라이브 전환 (overall-exam/weekly 월합산) — 2024·2025 레거시 확정값, 당해연도 라이브
      examGeneralCustomer: liveOrLegacy('exam-general-customer', (s) => s.introGeneral),
      examReferralCustomer: liveOrLegacy('exam-referral-customer', (s) => s.introCustomer),
      examReferralStaff: liveOrLegacy('exam-referral-staff', (s) => s.introStaff),
      examWorker: liveOrLegacy('exam-worker', (s) => s.jobOffice),
      examStudent: liveOrLegacy('exam-student', (s) => s.jobStudent),
      examEtc: liveOrLegacy('exam-etc', (s) => s.jobEtc),
      examGeneral: liveOrLegacy('exam-general', (s) => s.visionExam - s.oneDay),
      ratioGeneral: liveOrLegacy('ratio-general', (s) =>
        s.visionExam > 0 ? ((s.visionExam - s.oneDay) / s.visionExam) * 100 : null,
      ),
      // 일반 예약률(분모=일반검사) — 당해연도는 consultation 라이브(일반 직접 카운트), 2024·2025 레거시 (#19)
      rateVisionGeneral: consultLiveOrLegacy('rate-vision-general', (i) => consult.dataMap[CURRENT_YEAR]?.[i]?.visionGeneralBookRate),
      rateOneday: liveOrLegacy('rate-oneday', (s) =>
        s.oneDay > 0 ? (s.oneDayBooked / s.oneDay) * 100 : null,
      ),
      stopRate: liveOrLegacy('stop-rate', (s) =>
        s.visionExam > 0 ? (s.stopCount / s.visionExam) * 100 : null,
      ),
    }
  }, [resv.dataMap, outpatient.dataMap, procedure.dataMap, exam.dataMap, surgery.dataMap, visionRate.dataMap, cataractRate.dataMap, consult.dataMap, overallMonthly])

  // 최신(데이터 있는) 월 — 리포트 기준월
  const latestMonthIdx = useMemo(() => {
    const cur = charts.reservations[CURRENT_YEAR] ?? []
    for (let i = 11; i >= 0; i--) if (typeof cur[i] === 'number') return i
    return 0
  }, [charts])

  const stopReasonItem = stopReason.dataMap[CURRENT_YEAR]?.[latestMonthIdx] ?? null
  const periodLabel = `${CURRENT_YEAR}년 ${latestMonthIdx + 1}월`
  const stopRateYears = YEARS.filter((year) =>
    charts.stopRate[year]?.some((value) => typeof value === 'number'),
  )

  const isLoading =
    resv.isLoading || outpatient.isLoading || procedure.isLoading || exam.isLoading || surgery.isLoading || stopReason.isLoading || overall.isLoading || consult.isLoading

  // 전체 도표 목차(월간보고 순서). node 있으면 완료(차트 렌더+목차 링크), 없으면 미완성(목차 회색 표시).
  const items: { group: string; id: string; label: string; node?: ReactNode }[] = [
    { group: '예약', id: 'reservation-overall', label: '예약 종합 (콜·온라인)', node: <ReportLineChart title="예약 종합" suffix="(콜, 온라인)" years={YEARS} data={charts.reservations} yDomain={[800, 3000]} /> },
    { group: '예약', id: 'reservation-call', label: '콜 예약 (인콜·아웃콜)', node: <ReportLineChart title="콜 예약" suffix="(인콜, 아웃콜)" years={YEARS} data={charts.call} /> },
    { group: '예약', id: 'reservation-online', label: '온라인 예약 (네이버·카카오·홈페이지)', node: <ReportLineChart title="온라인 예약" suffix="(네이버, 카카오, 홈페이지)" years={YEARS} data={charts.online} /> },
    { group: '검사 유입', id: 'exam-general-customer', label: '일반 고객 검사 (소개 제외)', node: <ReportLineChart {...MONTHLY_LEGACY_CHARTS['exam-general-customer']} years={YEARS} data={charts.examGeneralCustomer} /> },
    { group: '검사 유입', id: 'exam-referral-customer', label: '고객소개 검사', node: <ReportLineChart {...MONTHLY_LEGACY_CHARTS['exam-referral-customer']} years={YEARS} data={charts.examReferralCustomer} /> },
    { group: '검사 유입', id: 'exam-referral-staff', label: '직원소개 검사', node: <ReportLineChart {...MONTHLY_LEGACY_CHARTS['exam-referral-staff']} years={YEARS} data={charts.examReferralStaff} /> },
    { group: '검사 유입', id: 'exam-by-class', label: '고객분류별 검사수' },
    { group: '검사 유입', id: 'exam-worker', label: '직장인 검사', node: <ReportLineChart {...MONTHLY_LEGACY_CHARTS['exam-worker']} years={YEARS} data={charts.examWorker} /> },
    { group: '검사 유입', id: 'exam-student', label: '학생 검사', node: <ReportLineChart {...MONTHLY_LEGACY_CHARTS['exam-student']} years={YEARS} data={charts.examStudent} /> },
    { group: '검사 유입', id: 'exam-etc', label: '기타 검사', node: <ReportLineChart {...MONTHLY_LEGACY_CHARTS['exam-etc']} years={YEARS} data={charts.examEtc} /> },
    { group: '검사수', id: 'exam-cataract', label: '백내장 검사수', node: <ReportLineChart title="백내장 검사수" years={YEARS} data={charts.cataractExam} /> },
    { group: '검사수', id: 'exam-vision', label: '시력교정 검사', node: <ReportLineChart title="시력교정 검사" years={YEARS} data={charts.visionExam} /> },
    { group: '검사수', id: 'exam-count', label: '검사수', node: <ReportLineChart title="검사수" years={YEARS} data={charts.examCount} /> },
    { group: '검사수', id: 'exam-oneday', label: '원데이 검사', node: <ReportLineChart title="원데이 검사" years={YEARS} data={charts.oneDayExam} /> },
    { group: '검사수', id: 'exam-general', label: '일반 검사', node: <ReportLineChart {...MONTHLY_LEGACY_CHARTS['exam-general']} years={YEARS} data={charts.examGeneral} /> },
    { group: '비율', id: 'ratio-general', label: '일반검사 비율', node: <ReportLineChart {...MONTHLY_LEGACY_CHARTS['ratio-general']} years={YEARS} data={charts.ratioGeneral} /> },
    { group: '비율', id: 'rate-cataract', label: '백내장 예약률', node: <ReportLineChart title="백내장 예약률" suffix="(수술예약건/검사자)" years={YEARS} data={charts.cataractRate} format="percent" /> },
    { group: '비율', id: 'rate-vision', label: '시력교정 예약률', node: <ReportLineChart title="시력교정 예약률" suffix="(수술예약건/검사자)" years={YEARS} data={charts.visionRate} format="percent" /> },
    { group: '비율', id: 'rate-vision-general', label: '시력교정 일반예약률', node: <ReportLineChart {...MONTHLY_LEGACY_CHARTS['rate-vision-general']} years={YEARS} data={charts.rateVisionGeneral} /> },
    { group: '비율', id: 'rate-oneday', label: '원데이 예약률', node: <ReportLineChart {...MONTHLY_LEGACY_CHARTS['rate-oneday']} years={YEARS} data={charts.rateOneday} /> },
    { group: '전환&성공', id: 'success-rate', label: '시력교정 상담성공률', node: <ReportSuccessRateChart year={CURRENT_YEAR} all={charts.successAll} oneday={charts.successOneday} general={charts.successGeneral} /> },
    { group: '중단', id: 'stop-rate', label: '중단율', node: <ReportLineChart {...MONTHLY_LEGACY_CHARTS['stop-rate']} years={stopRateYears.length ? stopRateYears : [CURRENT_YEAR]} data={charts.stopRate} percentFractionDigits={1} /> },
    { group: '중단', id: 'stop-reason', label: '중단 사유', node: <StopReasonBar item={stopReasonItem} monthLabel={periodLabel} /> },
    { group: '수술', id: 'surgery-cataract', label: '백내장 수술', node: <ReportLineChart title="백내장 수술" years={YEARS} data={charts.cataractSurgery} /> },
    { group: '수술', id: 'surgery-vision', label: '시력교정 수술', node: <ReportLineChart title="시력교정 수술" years={YEARS} data={charts.visionSurgery} /> },
    { group: '수술', id: 'surgery-total', label: '총 수술수', node: <ReportLineChart title="총 수술수" years={YEARS} data={charts.totalSurgery} /> },
    { group: '수술', id: 'surgery-detail', label: '수술 상세표', node: <ReportSurgeryTable dataMap={surgery.dataMap} /> },
    { group: '외래', id: 'outpatient', label: '외래수', node: <ReportLineChart title="외래수" years={YEARS} data={charts.outpatient} /> },
  ]
  const doneCount = items.filter((it) => it.node).length

  // CSV 다운로드 연도 선택 팝업
  const [csvOpen, setCsvOpen] = useState(false)
  const [csvScope, setCsvScope] = useState<'all' | number>('all')
  const csvYearOptions: { value: 'all' | number; label: string }[] = [
    { value: 'all', label: '전체' },
    ...[...YEARS].sort((a, b) => a - b).map((year) => ({ value: year, label: `${year}년` })),
  ]

  const handleDownloadCsv = (scope: 'all' | number) => {
    const selectedYears = scope === 'all' ? YEARS : [scope]
    const csv = buildMonthlyReportCsv({
      years: selectedYears,
      charts: charts as unknown as Record<string, unknown>,
      currentYear: CURRENT_YEAR,
      success: { all: charts.successAll, oneday: charts.successOneday, general: charts.successGeneral },
      stopReasonByMonth: stopReason.dataMap[CURRENT_YEAR] ?? [],
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
    <div className="flex justify-center gap-6">
      {/* 좌측 컬럼: 목차를 콘텐츠 왼쪽 끝에. 우측 spacer와 함께 본문을 정중앙 정렬 (화면 전용) */}
      <div className="hidden w-0 flex-1 justify-start min-[1520px]:flex">
        <nav className="report-no-print sticky top-3 h-[calc(100vh-6rem)] w-[210px] overflow-y-auto rounded-lg border border-border/70 bg-white p-3 shadow-sm">
        <p className="mb-1 px-1 text-xs font-bold text-foreground">
          전체 도표 <span className="font-medium text-muted-foreground">({doneCount}/{items.length})</span>
        </p>
        <ul className="space-y-0.5 text-[13px]">
          {items.map((it, idx) => {
            const showGroup = idx === 0 || items[idx - 1].group !== it.group
            return (
              <Fragment key={it.id}>
                {showGroup && (
                  <li className="px-1 pt-2 text-[11px] font-bold text-muted-foreground">{it.group}</li>
                )}
                <li>
                  {it.node ? (
                    <a href={`#c-${it.id}`} className="flex items-center gap-1.5 rounded px-1.5 py-1 text-gray-700 hover:bg-blue-50">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      <span className="truncate">{it.label}</span>
                    </a>
                  ) : (
                    <span className="flex items-center gap-1.5 px-1.5 py-1 text-gray-400">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full border border-gray-300" />
                      <span className="truncate">{it.label}</span>
                    </span>
                  )}
                </li>
              </Fragment>
            )
          })}
        </ul>
        </nav>
      </div>

      {/* 본문(인쇄 영역) — 정중앙 */}
      <div id="report-print" className="shrink-0 space-y-6">
        {/* 헤더 + PDF 버튼 (인쇄 시 숨김) */}
        <div className="report-no-print flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">월간 레포트</h1>
            <p className="text-sm text-muted-foreground">
              {periodLabel} 기준 · 당해연도({CURRENT_YEAR})·전년도({CURRENT_YEAR - 1})·전전년도({CURRENT_YEAR - 2}) 3개년 비교
              {' · '}
              {CURRENT_YEAR - 2}·{CURRENT_YEAR - 1} 확정값 + {CURRENT_YEAR} 운영 DB 라이브
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCsvOpen(true)}
              disabled={isLoading}
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
          </div>
        </div>

        {isLoading ? (
          <div className="mx-auto w-[1040px] space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <ReportChartSkeleton key={i} />
            ))}
          </div>
        ) : (
          // 고정폭(1040px): 화면·인쇄 차트 크기를 동일하게 → Recharts 재측정 없이 PDF에 12개월 전부·정렬 유지.
          <div className="mx-auto w-[1040px] space-y-6">
            {items
              .filter((it) => it.node)
              .map((it) => (
                <div key={it.id} id={`c-${it.id}`} className="scroll-mt-4">
                  {it.node}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* 우측 spacer: 좌측 목차와 동일 폭으로 본문을 정중앙에 고정 */}
      <div className="hidden w-0 flex-1 min-[1520px]:block" aria-hidden />

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
            <h2 className="text-base font-bold text-foreground">CSV 다운로드</h2>
            <p className="mt-1 text-sm text-muted-foreground">내려받을 연도를 선택하세요.</p>
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
    </div>
  )
}
