/**
 * 전화번호 표시 포맷 — 저장은 하이픈 없는 형식(SmsTarget.normalizePhone)이지만
 * 화면은 하이픈을 붙여 가독성을 확보한다. 검색·API 는 원본을 그대로 쓴다.
 *
 * 예)
 *   01012345678  → 010-1234-5678   (휴대폰 11자리)
 *   0101234567   → 010-123-4567    (휴대폰 10자리)
 *   0212345678   → 02-1234-5678    (서울 지역번호 + 8자리)
 *   021234567    → 02-123-4567     (서울 지역번호 + 7자리)
 *   그 외         → 원본 그대로       (알 수 없는 형식은 손대지 않는다)
 *
 * 빈 값은 빈 문자열을 돌려준다 — 호출측에서 `|| '-'` 같은 fallback 을 그대로 쓰라는 뜻.
 */
export const formatPhone = (value: string | null | undefined): string => {
  if (!value) return ''
  const digits = value.replace(/\D/g, '')
  if (digits.length === 11)
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  if (digits.length === 10)
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 9 && digits.startsWith('02'))
    return `02-${digits.slice(2, 5)}-${digits.slice(5)}`
  if (digits.length === 10 && digits.startsWith('02'))
    return `02-${digits.slice(2, 6)}-${digits.slice(6)}`
  return value
}
