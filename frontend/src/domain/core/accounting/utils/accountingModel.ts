import type { MedicalReceipt } from '../type/accounting'

export type PeriodMode = 'daily' | 'weekly' | 'monthly'

/** 회계 리스트 표 행 수 선택지 (예전 AccountingPagination 과 같은 값). */
export const ACCOUNTING_PAGE_SIZE_OPTIONS = [50, 100, 200, 500]

export const formatWonCompact = (value: number | string): string => {
  const amount = Number(value)
  if (Math.abs(amount) >= 100_000_000)
    return `${(amount / 100_000_000).toFixed(1)}억`
  if (Math.abs(amount) >= 10_000)
    return `${Math.round(amount / 10_000).toLocaleString('ko-KR')}만`
  return amount.toLocaleString('ko-KR')
}

/** 실수납합계 — 실수납액 + 미수회수, 순수 환불행(일련번호 98)은 −환불액. 백엔드 월별 재집계와 같은 규칙. */
export const medicalNetRevenue = (row: MedicalReceipt): number =>
  row.serialNo === 98 ? -row.refund : row.actualPaid + row.outstandingRecovered

export const matchesKeyword = (
  values: Array<string | number>,
  keyword: string,
): boolean => {
  const normalized = keyword.trim().toLowerCase()
  if (!normalized) return true
  return values.some((value) =>
    String(value).toLowerCase().includes(normalized),
  )
}

/** "데이터 기준 YYYY-MM-DD · from~to" — 적재 전이면 미상. */
export const dataStamp = (
  loadedAt: string | null | undefined,
  from?: string | null,
  to?: string | null,
) => {
  if (!loadedAt) return { date: '미상', range: '' }
  return { date: loadedAt, range: from && to ? `${from}~${to}` : '' }
}
