/** 이번 달(YYYY-MM) — 매 호출마다 평가해 자정/월 경계 후에도 최신. */
export const currentMonth = (): string => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

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

/** from~to 포함일수(같은 날이면 1). from > to 면 0. */
export const daysBetween = (from: string, to: string): number => {
  const a = new Date(`${from}T00:00:00`).getTime()
  const b = new Date(`${to}T00:00:00`).getTime()
  if (b < a) return 0
  return Math.floor((b - a) / 86_400_000) + 1
}

/** 두 날짜가 같은 달인지 — 셀 편집·진단은 period(YYYY-MM) 파라미터를 요구하므로 필요. */
export const isSingleMonthRange = (from: string, to: string): boolean =>
  Boolean(from) && from.slice(0, 7) === to.slice(0, 7)

/** from~to 범위 유효성. ok=false면 reason 을 사용자에게 표시. */
export function validateRange(
  from: string,
  to: string,
): { ok: boolean; reason?: string } {
  if (!from || !to)
    return { ok: false, reason: '시작일과 종료일을 모두 선택하세요.' }
  if (from > to) return { ok: false, reason: '시작일이 종료일보다 늦습니다.' }
  const days = daysBetween(from, to)
  if (days > MAX_RANGE_DAYS)
    return {
      ok: false,
      reason: `조회 범위는 최대 ${MAX_RANGE_DAYS}일까지 가능합니다 (현재 ${days}일).`,
    }
  return { ok: true }
}
