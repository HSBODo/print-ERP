import { addDays, isoWeekMonday, isoWeeksInYear, toIsoDate } from '@/utils/isoWeek'

/**
 * 레포트 주차 축 — 주차 레포트가 쓰는 연간 주차 목록/분배 로직.
 *
 * 주차 규칙은 **ISO 8601**(`@/utils/isoWeek`)을 그대로 따른다 — 예약통계시스템·수술별 비중의
 * '주차' 탭과 같은 번호 체계라 화면 간 "31주차"가 항상 같은 주를 가리킨다.
 *   - 월요일 시작, 첫 목요일이 든 주가 1주차 (한 해 52 또는 53주)
 *   - 1주차는 전년 12월을, 마지막 주차는 다음 해 1월을 물 수 있다
 *
 * `daysByMonth` 는 **그 해에 속한 날짜만** 월별로 센다(연 경계 날짜 제외).
 * 월 경계 주차(`crossMonth`)는 두 달에 모두 속하므로 {@link weeksOfMonth} 가 양쪽 달에서 반환한다.
 * (예: 2026-08 선택 → 7/27~8/2 주차와 8/31~9/6 주차가 함께 나온다)
 *
 * ⚠️ `@/utils/weekBucket` 의 `weekOf()` 는 "그 달의 주차"(월 경계 분할)라 성격이 다르다. 혼동 주의.
 */

const shortMd = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`

export interface ReportWeek {
  /** ISO 8601 연간 주차 (1 ~ 52/53) */
  week: number
  /** 월요일 YYYY-MM-DD (1주차는 전년 12월일 수 있음) */
  startDate: string
  /** 일요일 YYYY-MM-DD (마지막 주차는 익년 1월일 수 있음) */
  endDate: string
  /** 그 해에 속한 날짜의 월별 일수 (1-12 → 1~7) */
  daysByMonth: Record<number, number>
  /** 이 주가 걸친 월(그 해 기준, 오름차순) */
  months: number[]
  /** 월 경계를 걸친 주차 */
  crossMonth: boolean
  /** "31주" */
  label: string
  /** "7/27~8/2" */
  rangeLabel: string
}

/** 해당 ISO 연도의 전체 주차(52 또는 53개). */
export function weeksOfYear(year: number): ReportWeek[] {
  return Array.from({ length: isoWeeksInYear(year) }, (_, i) => {
    const week = i + 1
    const monday = isoWeekMonday(year, week)
    const sunday = addDays(monday, 6)

    const daysByMonth: Record<number, number> = {}
    for (let d = 0; d < 7; d++) {
      const day = addDays(monday, d)
      if (day.getFullYear() !== year) continue
      const m = day.getMonth() + 1
      daysByMonth[m] = (daysByMonth[m] ?? 0) + 1
    }

    return {
      week,
      startDate: toIsoDate(monday),
      endDate: toIsoDate(sunday),
      daysByMonth,
      months: Object.keys(daysByMonth).map(Number).sort((a, b) => a - b),
      crossMonth: monday.getMonth() !== sunday.getMonth(),
      label: `${week}주`,
      rangeLabel: `${shortMd(monday)}~${shortMd(sunday)}`,
    }
  })
}

/** 해당 월에 하루라도 걸친 주차 — 월 경계 주차를 포함한다. */
export const weeksOfMonth = (weeks: ReportWeek[], month: number): ReportWeek[] =>
  weeks.filter((w) => w.months.includes(month))

const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate()

/**
 * 월별 값 → 주차 값 **임시 분배**(주차 집계 API 연동 전 UI 미리보기용).
 *
 * - `sum`(건수): 월값을 그 달의 일수로 나눠 주차에 속한 일수만큼 배분 후 합산·반올림
 * - `avg`(비율): 주차에 속한 일수를 가중치로 월값을 가중평균
 *
 * 비교 연도(전년·전전년)도 **기준연도 주차 구성**을 그대로 쓴다 — 주차 번호 기준 비교이므로
 * 연도별 요일 차이는 무시한다(실데이터 연동 시 서버 주차 집계로 대체).
 */
export function monthlyToWeekly(
  data: Record<number, (number | null)[]>,
  weeks: ReportWeek[],
  mode: 'sum' | 'avg',
): Record<number, (number | null)[]> {
  const out: Record<number, (number | null)[]> = {}
  for (const [key, months] of Object.entries(data)) {
    const year = Number(key)
    out[year] = weeks.map((w) => {
      let acc = 0
      let weight = 0
      for (const m of w.months) {
        const v = months?.[m - 1]
        if (typeof v !== 'number') continue
        const days = w.daysByMonth[m] ?? 0
        acc += mode === 'avg' ? v * days : (v * days) / daysInMonth(year, m)
        weight += days
      }
      if (!weight) return null
      return mode === 'avg' ? acc / weight : Math.round(acc)
    })
  }
  return out
}
