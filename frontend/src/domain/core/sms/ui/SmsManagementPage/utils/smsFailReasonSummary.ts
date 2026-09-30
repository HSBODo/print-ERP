import type { SmsQueueRow } from '../../../type/api'

/**
 * FAILED/CANCELED 큐 행의 last_error 를 관리자용 카테고리로 축약한다.
 *
 * 매칭 규칙은 SmsSendService · SolapiSendService · SmsDispatchJob · SolapiWebhookService 가
 * 실제로 저장하는 문자열 프리픽스를 근사 매칭. 정확한 카탈로그가 아니라 관리자가 [실패 재실행]
 * 을 눌러야 할지 판단할 수 있게 대분류만 나눈다.
 *
 * <b>추가·조정 방법</b>
 *   새 사유 문자열이 로그에 자주 뜨는데 여기서 '기타' 로 떨어지면, 규칙을 아래
 *   categorize 함수에 한 줄 추가한다 — 매칭은 더 구체적인 것부터 위쪽에 둔다.
 */

export const REASON_CATEGORIES = [
  '수신거부',
  '번호무효',
  '홀딩',
  '문구 미설정',
  '이미 발송',
  '광고톡 시간대',
  '도달 실패',
  '솔라피 오류',
  '기타',
] as const

export type ReasonCategory = (typeof REASON_CATEGORIES)[number]

/**
 * 카테고리별 tailwind 배지 색상. 성격이 비슷한 것끼리 계열을 맞춘다.
 *   회색 계열 — 사람이 명시적으로 막은 것 (수신거부·홀딩)
 *   빨강·주황 계열 — 데이터 문제 (번호무효·문구 미설정·도달 실패)
 *   그 외 — 정보성 (이미 발송·광고톡 시간대·솔라피 오류)
 */
export const CATEGORY_STYLE: Record<ReasonCategory, string> = {
  수신거부: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  번호무효: 'bg-red-50 text-red-700 hover:bg-red-100',
  홀딩: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
  '문구 미설정': 'bg-orange-50 text-orange-700 hover:bg-orange-100',
  '이미 발송': 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  '광고톡 시간대': 'bg-purple-50 text-purple-700 hover:bg-purple-100',
  '도달 실패': 'bg-rose-50 text-rose-700 hover:bg-rose-100',
  '솔라피 오류': 'bg-pink-50 text-pink-700 hover:bg-pink-100',
  기타: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
}

/**
 * lastError → 카테고리. 매칭 우선순위는 위에서 아래(더 구체적인 것 먼저).
 * lastError 가 비어 있거나 매칭이 하나도 안 되면 '기타'.
 */
export function categorize(
  lastError: string | null | undefined,
): ReasonCategory {
  if (!lastError) return '기타'
  const e = lastError
  if (e.includes('수신거부')) return '수신거부'
  if (
    e.includes('발송 불가') ||
    e.includes('연락처가 없') ||
    e.includes('번호가 아니')
  )
    return '번호무효'
  if (e.includes('홀딩')) return '홀딩'
  if (e.includes('문구가 설정')) return '문구 미설정'
  if (e.includes('이미 발송')) return '이미 발송'
  if (e.includes('광고톡')) return '광고톡 시간대'
  if (e.includes('도달 실패') || e.includes('상태코드')) return '도달 실패'
  if (e.toLowerCase().includes('solapi') || e.includes('SDK'))
    return '솔라피 오류'
  return '기타'
}

/**
 * 사유별 카운트 그룹핑. 카운트 내림차순 정렬 (많이 뜨는 사유가 먼저 보이도록).
 * 카테고리가 안 뜬 것은 아예 목록에 안 낸다 — 0건 배지는 관리자 혼란 유발.
 */
export function groupByReason(
  rows: SmsQueueRow[],
): Array<{ category: ReasonCategory; count: number }> {
  const counts = new Map<ReasonCategory, number>()
  for (const row of rows) {
    const c = categorize(row.lastError)
    counts.set(c, (counts.get(c) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
}
