/**
 * 'YYYY-MM-DD' · 'YYYY-MM' 문자열 날짜 유틸 — 모두 로컬 시간 기준.
 * (`toISOString()` 은 UTC 라 한국 시간 오전 9시 전에는 하루 전 날짜가 나온다)
 */

export interface DateRange {
  /** 'YYYY-MM-DD' */
  from: string
  /** 'YYYY-MM-DD' (포함) */
  to: string
}

export const pad2 = (n: number) => String(n).padStart(2, '0')

/** Date → 'YYYY-MM-DD' */
export const toIsoDate = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`

/** 'YYYY-MM-DD' → Date (로컬 자정) */
export const parseIsoDate = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** 로컬 기준 날짜 이동(월/연 경계 자동 보정). */
export const addDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)

export const todayIso = (): string => toIsoDate(new Date())

/** Date → 'YYYY-MM' */
export const toMonth = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`

export const currentMonth = (): string => toMonth(new Date())

/** 'YYYY-MM' 을 delta 개월 이동 */
export const shiftMonth = (month: string, delta: number): string => {
  const [y, m] = month.split('-').map(Number)
  return toMonth(new Date(y, m - 1 + delta, 1))
}

/** 'YYYY-MM' → 그 달 1일 ~ 말일 */
export const monthRange = (month: string): DateRange => {
  const [y, m] = month.split('-').map(Number)
  return {
    from: `${month}-01`,
    to: `${month}-${pad2(new Date(y, m, 0).getDate())}`,
  }
}

/** 이번 달 1일 ~ 말일 */
export const thisMonthRange = (): DateRange => monthRange(currentMonth())

/** 종료일이 오늘을 넘으면 오늘로 자른다 (진행 중인 달 조회용) */
export const capToToday = ({ from, to }: DateRange): DateRange => {
  const today = todayIso()
  return { from, to: to > today ? today : to }
}

/** 양 끝 포함 일수 */
export const daysBetween = (from: string, to: string): number =>
  Math.round(
    (parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / 86_400_000,
  ) + 1

/**
 * 조회 기간 검증 — 문제가 있으면 안내 문구, 없으면 null.
 * `useFilter` 의 `validate` 에 넘긴다.
 */
export function validateRange(
  { from, to }: DateRange,
  { maxDays }: { maxDays?: number } = {},
): string | null {
  if (!from || !to) return '조회 기간을 선택해 주세요.'
  if (from > to) return '시작일이 종료일보다 늦습니다.'
  const days = daysBetween(from, to)
  if (maxDays && days > maxDays)
    return `조회 기간은 최대 ${maxDays}일까지 가능합니다 (현재 ${days}일).`
  return null
}

/** to 부터 from 까지 내림차순 연도 목록 (셀렉트 옵션용) */
export const yearsDesc = (
  from: number,
  to: number = new Date().getFullYear(),
): number[] => Array.from({ length: to - from + 1 }, (_, i) => to - i)
