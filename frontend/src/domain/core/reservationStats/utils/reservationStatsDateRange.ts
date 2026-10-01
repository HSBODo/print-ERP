import { currentMonth, type DateRange, validateRange } from '#shared/utils/date'

/** 선택 월의 조회 범위. 진행 중인 달은 전일까지, 지난 달은 말일까지. */
export function periodRange(period: string): {
  from: string
  to: string
  lastDay: number
} {
  const now = new Date()
  const year = Number(period.slice(0, 4))
  const month = Number(period.slice(5, 7))
  const daysInMonth = new Date(year, month, 0).getDate()
  const isCurrent = now.getFullYear() === year && now.getMonth() + 1 === month
  const lastDay = isCurrent
    ? Math.max(1, Math.min(daysInMonth, now.getDate() - 1))
    : daysInMonth

  return {
    from: `${period}-01`,
    to: `${period}-${String(lastDay).padStart(2, '0')}`,
    lastDay,
  }
}

/**
 * 백엔드 ReservationStatsRequestValidator.MAX_RANGE_DAYS = 92 와 동일. 초과 시 400.
 * 프론트에서 미리 차단해 서버 왕복 없이 안내한다.
 */
export const MAX_RANGE_DAYS = 92

/** 두 날짜가 같은 달인지 — 셀 편집·진단은 period(YYYY-MM) 파라미터를 요구하므로 필요. */
export const isSingleMonthRange = (from: string, to: string): boolean =>
  Boolean(from) && from.slice(0, 7) === to.slice(0, 7)

/** 기본 조회 범위 = 당월(월초 ~ 어제, 1일이면 1일). 날짜 선택 상한도 이 종료일. */
export const defaultStatsRange = (): DateRange => {
  const { from, to } = periodRange(currentMonth())
  return { from, to }
}

/** useFilter validate — 백엔드 92일 제한을 미리 막는다. */
export const validateStatsRange = ({ range }: { range: DateRange }) =>
  validateRange(range, { maxDays: MAX_RANGE_DAYS })
