import type { WeeklyReportItem } from '@/api/report'
import type { ReportWeek } from '@/components/report/reportWeeks'
import type { ReportSeriesKey } from './useReportSeries'

/**
 * 주차 레포트 원시 집계 → 도표 시리즈.
 *
 * 백엔드는 (ISO 주차연도, 주차)별 **원시 값**만 내려주고, 파생 지표(예약률·비율·중단율)는 여기서
 * 계산한다 — 월간 레포트가 `useReportSeries` 에서 같은 공식을 쓰는 것과 짝을 맞춘다.
 *
 * 연도 비교는 **주차 번호 기준**이다(2026-31주 ↔ 2025-31주). ISO 주차라 연도별로 날짜가 며칠
 * 어긋나지만, 주차 비교의 표준 방식이고 예약통계·수술별 비중의 주차 탭과도 같다.
 */

/** 표시 중인 주차 배열 기준의 (연도 → 값 배열). 값이 없는 주는 null(선 끊김). */
export type WeeklySeries = Record<number, (number | null)[]>

const num = (v: number | null | undefined): number | null => (typeof v === 'number' ? v : null)

/** 분자/분모 → 백분율. 분모가 없거나 0 이면 null. */
const rate = (numerator: number | null | undefined, denominator: number | null | undefined): number | null => {
  if (typeof numerator !== 'number' || typeof denominator !== 'number' || denominator <= 0) return null
  return (numerator / denominator) * 100
}

const diff = (a: number | null | undefined, b: number | null | undefined): number | null =>
  typeof a === 'number' && typeof b === 'number' ? a - b : null

export function buildWeeklySeries(
  items: WeeklyReportItem[],
  weeks: ReportWeek[],
  years: number[],
): Partial<Record<ReportSeriesKey, WeeklySeries>> {
  // (주차연도 → 주차 → 행)
  const byYear = new Map<number, Map<number, WeeklyReportItem>>()
  for (const it of items) {
    const byWeek = byYear.get(it.year) ?? new Map<number, WeeklyReportItem>()
    byWeek.set(it.week, it)
    byYear.set(it.year, byWeek)
  }

  const pick = (get: (it: WeeklyReportItem) => number | null): WeeklySeries => {
    const out: WeeklySeries = {}
    years.forEach((y) => {
      out[y] = weeks.map((w) => {
        const it = byYear.get(y)?.get(w.week)
        return it ? get(it) : null
      })
    })
    return out
  }

  return {
    reservations: pick((it) => num(it.reservations)),
    call: pick((it) => num(it.call)),
    online: pick((it) => num(it.online)),

    examGeneralCustomer: pick((it) => num(it.introGeneral)),
    examReferralCustomer: pick((it) => num(it.introCustomer)),
    examReferralStaff: pick((it) => num(it.introStaff)),
    examWorker: pick((it) => num(it.jobOffice)),
    examStudent: pick((it) => num(it.jobStudent)),
    examEtc: pick((it) => num(it.jobEtc)),

    cataractExam: pick((it) => num(it.cataractExam)),
    visionExam: pick((it) => num(it.visionExam)),
    examCount: pick((it) => num(it.examTotal)),
    dreamlensNew: pick((it) => num(it.dreamlensNew)),
    dreamlensFu: pick((it) => num(it.dreamlensFu)),
    oneDayExam: pick((it) => num(it.oneDay)),
    // 일반 검사 = 검사수(전체) − 원데이. '원데이 + 일반 = 검사수' 가 성립해야 한다
    // (월간과 같은 기준 — useReportSeries.ts 의 examGeneral 참조).
    // 종전에는 시력교정 기준(visionExam − oneDay)이라 검사자 리스트의 examType 집계와 어긋났다.
    examGeneral: pick((it) => diff(it.examTotal, it.oneDay)),

    ratioGeneral: pick((it) => rate(diff(it.examTotal, it.oneDay), it.examTotal)),
    cataractRate: pick((it) => rate(it.cataractBooked, it.cataractExam)),
    visionRate: pick((it) => rate(it.visionBooked, it.visionExam)),
    rateVisionGeneral: pick((it) => rate(it.bookedGeneral, it.examGeneralBase)),
    rateOneday: pick((it) => rate(it.oneDayBooked, it.oneDay)),
    stopRate: pick((it) => rate(it.stopCount, it.visionExam)),

    cataractSurgery: pick((it) => num(it.cataractSurgery)),
    visionSurgery: pick((it) => num(it.visionSurgery)),
    totalSurgery: pick((it) => num(it.totalSurgery)),
    reoperation: pick((it) => num(it.reoperation)),

    outpatient: pick((it) => num(it.outpatient)),
  }
}
