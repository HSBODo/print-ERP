import { shortDate } from '@/utils/weekBucket'

/**
 * 레포트 주차(연간 주차) — 월간 레포트의 "주차 보기" 축을 만든다.
 *
 * 규칙:
 *  - 주는 **월요일~일요일**(리스트 페이지 주별 승인과 동일).
 *  - **1월 1일이 속한 주 = 1주차** → 1주차의 월요일은 전년 12월일 수 있다.
 *  - 이후 7일마다 +1. 그 해 안에 월요일이 있는 주까지 열거 → 52주 또는 53주.
 *  - `daysByMonth` 는 **그 해에 속한 날짜만** 월별로 센다(연 경계 날짜는 제외).
 *
 * 월 경계 주차(`crossMonth`)는 두 달에 모두 속하므로 `weeksOfMonth()` 가 양쪽 달에서 반환한다.
 * (예: 2026-08 선택 → 7/27~8/2 주차와 8/31~9/6 주차가 함께 나온다)
 *
 * ⚠️ `weekBucket.ts` 의 `weekOf()` 는 "그 달의 주차"(월 경계 분할)라 성격이 다르다. 혼동 주의.
 */

const DAY_MS = 86_400_000
const pad = (n: number) => String(n).padStart(2, '0')
const toIso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`

export interface ReportWeek {
  /** 연간 주차 (1 ~ 52/53) */
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

/** 해당 연도의 전체 주차(52 또는 53개)를 열거한다. */
export function weeksOfYear(year: number): ReportWeek[] {
  const jan1 = Date.UTC(year, 0, 1)
  const dow = (new Date(jan1).getUTCDay() + 6) % 7 // 월=0 … 일=6
  const yearEnd = Date.UTC(year, 11, 31)

  const weeks: ReportWeek[] = []
  let monday = jan1 - dow * DAY_MS
  for (let n = 1; monday <= yearEnd; n++, monday += 7 * DAY_MS) {
    const start = new Date(monday)
    const end = new Date(monday + 6 * DAY_MS)

    const daysByMonth: Record<number, number> = {}
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday + i * DAY_MS)
      if (d.getUTCFullYear() !== year) continue
      const m = d.getUTCMonth() + 1
      daysByMonth[m] = (daysByMonth[m] ?? 0) + 1
    }

    const startIso = toIso(start)
    const endIso = toIso(end)
    weeks.push({
      week: n,
      startDate: startIso,
      endDate: endIso,
      daysByMonth,
      months: Object.keys(daysByMonth).map(Number).sort((a, b) => a - b),
      crossMonth: start.getUTCMonth() !== end.getUTCMonth(),
      label: `${n}주`,
      rangeLabel: `${shortDate(startIso)}~${shortDate(endIso)}`,
    })
  }
  return weeks
}

/** 해당 월에 하루라도 걸친 주차 — 월 경계 주차를 포함한다. */
export const weeksOfMonth = (weeks: ReportWeek[], month: number): ReportWeek[] =>
  weeks.filter((w) => w.months.includes(month))

const daysInMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 0)).getUTCDate()

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
