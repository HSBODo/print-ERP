import type { EventNote } from '../type/api'

/** 2026-08-28T10:30:00 → 2026-08-28 10:30 */
export const formatDateTime = (value: string) =>
  value.slice(0, 16).replace('T', ' ')

/** 기간형이면 '시작 ~ 종료', 아니면 '—' */
export const formatPeriod = ({ startDate, endDate }: EventNote) =>
  startDate || endDate ? `${startDate ?? ''} ~ ${endDate ?? ''}` : '—'
