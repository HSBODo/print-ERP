/**
 * ISO 8601 연간 주차(1~53) 유틸 — 월요일 시작, 첫 목요일이 든 주가 그 해의 1주차.
 *
 * ⚠️ '주별'(그 달의 1~5주, 월 경계에서 잘라 각 달로 귀속)과는 버킷 규칙이 다르다.
 *    주차 1주는 전년 12월을, 마지막 주차는 다음 해 1월을 물 수 있다.
 *    예) 2026년 1주차 = 2025-12-29(월)~2026-01-04(일), 53주차 = 2026-12-28~2027-01-03.
 */

const pad2 = (n: number) => String(n).padStart(2, '0')

/** Date → 'YYYY-MM-DD' (로컬 기준 — Date 생성자와 짝을 맞춘다). */
export const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`

/** 로컬 기준 날짜 이동(월/연 경계 자동 보정). */
export const addDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)

/**
 * ISO 8601 주차. 연말·연초 경계 주는 year 가 인접 해로 넘어가므로 라벨링 시 함께 쓴다.
 * 예) 2026-01-01(목) → {year:2026, week:1} · 2026-06-01(월) → {year:2026, week:23}
 */
export function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  )
  const dayNum = d.getUTCDay() || 7 // 일=0 → 7 로 취급해 월요일=1..일요일=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum) // 그 주의 목요일로 이동 (ISO 규칙)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  )
  return { year: d.getUTCFullYear(), week }
}

/** 해당 ISO 연도 N주차의 월요일. (1월 4일은 항상 1주차) */
export function isoWeekMonday(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4)
  const mondayOffset = (jan4.getDay() + 6) % 7 // 월=0 … 일=6
  return new Date(year, 0, 4 - mondayOffset + (week - 1) * 7)
}

/** 해당 ISO 연도의 마지막 주차(52 또는 53). 12월 28일은 항상 그 해 마지막 주에 속한다. */
export const isoWeeksInYear = (year: number): number =>
  isoWeek(new Date(year, 11, 28)).week

/** 해당 ISO 연도 전체 주차의 조회 범위 — 1주차 월요일 ~ 마지막 주차 일요일. */
export function isoYearRange(year: number): {
  from: string
  to: string
  weeks: number
} {
  const weeks = isoWeeksInYear(year)
  return {
    from: toIsoDate(isoWeekMonday(year, 1)),
    to: toIsoDate(addDays(isoWeekMonday(year, weeks), 6)),
    weeks,
  }
}
