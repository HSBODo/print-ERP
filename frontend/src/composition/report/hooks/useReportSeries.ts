import { useMemo } from 'react'

import { useBatchLastSuccess } from '#domain/core/batch/hooks/useBatchLastSuccess'
import { useCataractReservationRateTrend } from '#domain/core/consultation/hooks/useCataractReservationRateTrend'
import { useConsultationRateTrend } from '#domain/core/consultation/hooks/useConsultationRateTrend'
import { useStopReasonMonthly } from '#domain/core/consultation/hooks/useStopReasonMonthly'
import { useExamCountByClass } from '#domain/core/exam/hooks/useExamCountByClass'
import { useExaminationTrend } from '#domain/core/exam/hooks/useExaminationTrend'
import { useProcedureExamTrend } from '#domain/core/exam/hooks/useProcedureExamTrend'
import { useOutpatientCountTrend } from '#domain/core/outpatient/hooks/useOutpatientCountTrend'
import { useOverallExamMonthly } from '#domain/core/overall/hooks/useOverallExamMonthly'
import type { OverallExamMonthlyItem } from '#domain/core/overall/type/api'
import { useReservationOverallTrend } from '#domain/core/reservation/hooks/useReservationOverallTrend'
import { useSurgeryTrend } from '#domain/core/surgery/hooks/useSurgeryTrend'
import { CURRENT_YEAR } from '#shared/constants/chart'

import { isIncompleteMonth, YEARS } from '../utils/monthlyReportUtils'

/**
 * 레포트 공통 월별 시리즈 — 마트 + 레거시 확정값.
 *
 * 월간 레포트는 전 도표에 이걸 쓴다. 주차 레포트는 **주차로 분해되지 않는 4개 도표**
 * (고객분류별 검사수·상담성공률·중단 사유·수술 상세표)에만 쓰고, 나머지 주차 값은
 * `/api/report/weekly` 원시 집계를 `weeklyReportSeries.buildWeeklySeries` 가 계산한다.
 * (월값을 주차로 임시 분배하던 방식은 2026-07-30 실집계로 대체하며 제거)
 */

/**
 * 월간레포트 수술 3종 골든 override — 담당자 확정값.
 *
 * 마트(`mart_surgery_monthly`) 는 세부 수술방법 컬럼(lasik/smile/cat_mono/…)으로 세분화돼 있어
 * CSV 의 aggregate(백내장 수술·시력교정 수술·총 수술수) 를 subcolumn 으로 분해할 수 없다.
 * 그렇다고 대표 컬럼에 몰빵하면 "주요 수술별 비중"·"수술별 비중" 도표가 왜곡된다.
 *
 * 해결: 레포트 페이지에서만 이 3개 도표 값을 override 하고, 개별 수술 통계 페이지는
 * 배치 산출값(마트) 을 그대로 사용한다. (year, month) → { cataract, vision, total }.
 *
 * 세부 수술방법별 CSV 를 담당자에게 별도 제공받으면 이 override 를 제거하고 마트로 이관 가능.
 */
const SURGERY_GOLDEN: Record<
  number,
  Record<number, { cataract: number; vision: number; total: number }>
> = {
  2026: {
    1: { cataract: 90, vision: 1361, total: 1483 },
    2: { cataract: 67, vision: 1388, total: 1488 },
    3: { cataract: 69, vision: 657, total: 745 },
    4: { cataract: 42, vision: 568, total: 629 },
    5: { cataract: 61, vision: 722, total: 806 },
  },
}

export type ReportSeriesKey =
  | 'reservations'
  | 'call'
  | 'online'
  | 'cataractExam'
  | 'visionExam'
  | 'examCount'
  | 'oneDayExam'
  | 'cataractRate'
  | 'visionRate'
  | 'cataractSurgery'
  | 'visionSurgery'
  | 'totalSurgery'
  | 'reoperation'
  | 'outpatient'
  | 'successAll'
  | 'successOneday'
  | 'successGeneral'
  | 'examGeneralCustomer'
  | 'examReferralCustomer'
  | 'examReferralStaff'
  | 'examWorker'
  | 'examStudent'
  | 'examEtc'
  | 'examGeneral'
  | 'ratioGeneral'
  | 'rateVisionGeneral'
  | 'rateOneday'
  | 'stopRate'
  // 주차 전용 — 외래센터 주간보고 확정값이라 월간 대응 계열이 없다(월간에서는 항상 빈 값).
  | 'dreamlensNew'
  | 'dreamlensFu'

/** year → 12개월 값 배열 (없는 달은 null) */
export type MonthlySeries = Record<number, (number | null)[]>
export type ReportSeries = Record<ReportSeriesKey, MonthlySeries>

export interface ReportSeriesResult {
  charts: ReportSeries
  isLoading: boolean
  /** 최신(데이터 있는) 월 인덱스 — 0-based. 리포트 기준월 */
  latestMonthIdx: number
  /** 중단율 도표에 실제 값이 있는 연도만 */
  stopRateYears: number[]
  surgeryDataMap: ReturnType<typeof useSurgeryTrend>['dataMap']
  stopReasonDataMap: ReturnType<typeof useStopReasonMonthly>['dataMap']
  examByClassRows: ReturnType<typeof useExamCountByClass>['rows']
  lastBatchDate?: string
}

export function useReportSeries(): ReportSeriesResult {
  const resv = useReservationOverallTrend(YEARS)
  const outpatient = useOutpatientCountTrend(YEARS)
  const procedure = useProcedureExamTrend(YEARS)
  const exam = useExaminationTrend(YEARS)
  const surgery = useSurgeryTrend(YEARS)
  const stopReason = useStopReasonMonthly([CURRENT_YEAR])
  const visionRate = useCataractReservationRateTrend(YEARS, 'vision')
  const cataractRate = useCataractReservationRateTrend(YEARS, 'cataract')
  const overall = useOverallExamMonthly(YEARS)
  const consult = useConsultationRateTrend(YEARS)
  // 고객분류별 검사수는 24·25 에 해당 분류가 없어 당해연도만 조회한다.
  const examByClass = useExamCountByClass(CURRENT_YEAR)
  const lastBatch = useBatchLastSuccess()

  // 마트에서 받은 월별 검사자 종합지표를 (year → month → item) 인덱스로 정리
  const overallByYear = useMemo(() => {
    const acc: Record<number, Record<number, OverallExamMonthlyItem>> = {}
    for (const it of overall.items) {
      const byMonth = acc[it.year] ?? {}
      byMonth[it.month] = it
      acc[it.year] = byMonth
    }
    return acc
  }, [overall.items])

  const charts = useMemo<ReportSeries>(() => {
    // 연도별 12개월 배열 빌더 — 미래월/미완성월은 null(선 끊김)
    const build = (
      pick: (year: number, i: number) => number | null | undefined,
    ): MonthlySeries => {
      const out: MonthlySeries = {}
      YEARS.forEach((y) => {
        out[y] = Array.from({ length: 12 }, (_, i) => {
          if (isIncompleteMonth(y, i)) return null
          const v = pick(y, i)
          return typeof v === 'number' ? v : null
        })
      })
      return out
    }

    // 검사자 종합지표(overall) 기반 지표: 마트 값이 있으면 pick, 없으면 null
    const buildFromOverall = (
      pick: (s: OverallExamMonthlyItem) => number | null,
    ): MonthlySeries =>
      build((y, i) => {
        const s = overallByYear[y]?.[i + 1]
        return s ? pick(s) : null
      })

    // 예약률: 마트 응답의 reservationRate 를 정수로 반올림 (examCount 는 유효성 체크만)
    const rateSeries = (
      rateData: Record<
        number,
        { examCount: number; reservationRate: number }[]
      >,
    ): MonthlySeries =>
      build((y, i) => {
        const it = rateData[y]?.[i]
        return it && it.examCount ? Math.ceil(it.reservationRate) : null
      })

    return {
      reservations: build((y, i) => resv.dataMap[y]?.[i]?.reservations),
      call: build((y, i) => resv.dataMap[y]?.[i]?.call),
      online: build((y, i) => resv.dataMap[y]?.[i]?.online),
      cataractExam: build((y, i) => exam.dataMap[y]?.[i]?.cataract),
      visionExam: build((y, i) => exam.dataMap[y]?.[i]?.visionCorrection),
      examCount: build((y, i) => procedure.dataMap[y]?.[i]?.examCount),
      oneDayExam: build((y, i) => procedure.dataMap[y]?.[i]?.oneDayExamCount),
      cataractRate: rateSeries(cataractRate.dataMap),
      visionRate: rateSeries(visionRate.dataMap),
      // 수술 3종은 SURGERY_GOLDEN 이 있으면 골든값, 없으면 마트 산출값 (파일 상단 상수 참고).
      cataractSurgery: build(
        (y, i) =>
          SURGERY_GOLDEN[y]?.[i + 1]?.cataract ??
          surgery.dataMap[y]?.[i]?.cataractPatients,
      ),
      visionSurgery: build(
        (y, i) =>
          SURGERY_GOLDEN[y]?.[i + 1]?.vision ??
          surgery.dataMap[y]?.[i]?.visionPatients,
      ),
      totalSurgery: build(
        (y, i) =>
          SURGERY_GOLDEN[y]?.[i + 1]?.total ?? surgery.dataMap[y]?.[i]?.total,
      ),
      // 재수술 — 건 단위(레이저+렌즈). 주차 레포트도 같은 정의로 그린다.
      reoperation: build((y, i) => surgery.dataMap[y]?.[i]?.reoperation),
      outpatient: build((y, i) => outpatient.dataMap[y]?.[i]?.outpatientCount),
      // 드림렌즈 신규/FU 는 주차 단위 확정값만 존재한다 — 월간 레포트에서는 항목 자체를 감춘다
      // (ReportItem.weeklyOnly). 여기서는 타입을 채우기 위한 빈 계열.
      dreamlensNew: {},
      dreamlensFu: {},
      // 시력교정 상담성공률(검사중단/수술불가 제외) — 전체/원데이/일반 3계열.
      // 24·25 는 V18 시드가 vision_general_book_rate 만 채우고 count 는 0 이므로,
      // count 가드로 이 세 라인이 잘못된 0% 로 표시되는 것을 방지.
      successAll: build((y, i) => {
        const it = consult.dataMap[y]?.[i]
        return it && it.visionCounselCount > 0 ? it.visionConsultation : null
      }),
      successOneday: build((y, i) => {
        const it = consult.dataMap[y]?.[i]
        return it && it.visionCounselCount > 0
          ? it.visionConsultationOneday
          : null
      }),
      successGeneral: build((y, i) => {
        const it = consult.dataMap[y]?.[i]
        return it && it.visionCounselCount > 0
          ? it.visionConsultationGeneral
          : null
      }),
      // 검사자 종합지표 파생 — 마트에서 직접
      examGeneralCustomer: buildFromOverall((s) => s.introGeneral),
      examReferralCustomer: buildFromOverall((s) => s.introCustomer),
      examReferralStaff: buildFromOverall((s) => s.introStaff),
      examWorker: buildFromOverall((s) => s.jobOffice),
      examStudent: buildFromOverall((s) => s.jobStudent),
      examEtc: buildFromOverall((s) => s.jobEtc),
      // 일반 검사 = 검사수(전체) − 원데이. 둘 다 procedure(=검사자 리스트와 같은 모집단)에서 뽑아
      // '원데이 + 일반 = 검사수' 가 성립하게 한다 (2026-07: 561 + 643 = 1,204).
      // 종전에는 시력교정 기준(visionExam − overall.oneDay = 1,074 − 558 = 516)이라
      // 리스트의 examType 집계와 어긋났다.
      examGeneral: build((y, i) => {
        const it = procedure.dataMap[y]?.[i]
        return it ? it.examCount - it.oneDayExamCount : undefined
      }),
      ratioGeneral: build((y, i) => {
        const it = procedure.dataMap[y]?.[i]
        return it && it.examCount > 0
          ? ((it.examCount - it.oneDayExamCount) / it.examCount) * 100
          : null
      }),
      rateVisionGeneral: build(
        (y, i) => consult.dataMap[y]?.[i]?.visionGeneralBookRate,
      ),
      rateOneday: buildFromOverall((s) =>
        s.oneDay > 0 ? (s.oneDayBooked / s.oneDay) * 100 : null,
      ),
      stopRate: buildFromOverall((s) =>
        s.visionExam > 0 ? (s.stopCount / s.visionExam) * 100 : null,
      ),
    }
  }, [
    resv.dataMap,
    outpatient.dataMap,
    procedure.dataMap,
    exam.dataMap,
    surgery.dataMap,
    visionRate.dataMap,
    cataractRate.dataMap,
    consult.dataMap,
    overallByYear,
  ])

  // 최신(데이터 있는) 월 — 리포트 기준월
  const latestMonthIdx = useMemo(() => {
    const cur = charts.reservations[CURRENT_YEAR] ?? []
    for (let i = 11; i >= 0; i--) if (typeof cur[i] === 'number') return i
    return 0
  }, [charts])

  const stopRateYears = YEARS.filter((year) =>
    charts.stopRate[year]?.some((value) => typeof value === 'number'),
  )

  return {
    charts,
    isLoading:
      resv.isLoading ||
      outpatient.isLoading ||
      procedure.isLoading ||
      exam.isLoading ||
      surgery.isLoading ||
      stopReason.isLoading ||
      overall.isLoading ||
      consult.isLoading ||
      examByClass.isLoading,
    latestMonthIdx,
    stopRateYears,
    surgeryDataMap: surgery.dataMap,
    stopReasonDataMap: stopReason.dataMap,
    examByClassRows: examByClass.rows,
    lastBatchDate: lastBatch.data?.targetDate,
  }
}
