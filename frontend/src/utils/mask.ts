/**
 * 개인정보 마스킹 — 리스트 화면 공용.
 *
 * <b>지금은 CSV 내보내기에만 적용한다.</b> 화면은 레거시 관리자 화면과 동일하게 원문을 유지한다
 * (직원이 환자 식별·연락에 쓰기 때문). 파일은 PC 에 영구히 남고 메신저로 전달되므로 유출 위험이
 * 훨씬 크다 — 그래서 파일부터 막는다.
 * 화면에도 적용하려면 컬럼 정의의 render 에 같은 함수를 물리면 된다(계약 변경 없음).
 *
 * 원칙:
 *  - 빈 값은 그대로 둔다. 빈 칸을 '*' 로 채우면 '값이 있는데 가려진 것'으로 오해된다.
 *  - 형식을 모르는 값은 더 가린다(덜 가리는 쪽으로 실수하지 않는다).
 *  - 뒷자리 일부는 남긴다 — 전부 가리면 행 대조·중복 확인이 불가능해져 CSV 자체가 쓸모없어진다.
 */

const isBlank = (v: string | null | undefined): boolean => !v || !v.trim()

/**
 * 이름 — 처음과 끝만 남기고 가운데를 가린다.
 *
 * 홍길동 → 홍*동 · 남궁길동 → 남**동 · 홍길 → 홍* · 홍 → 홍
 * 한 글자는 가릴 가운데가 없다. 통째로 가리면 전 행이 '*' 가 되어 대조가 불가능해진다.
 * 영문명(John Smith)에도 같은 규칙이 적용된다 → J********h
 */
export const maskName = (value: string): string => {
  if (isBlank(value)) return value
  const s = value.trim()
  if (s.length <= 1) return s
  if (s.length === 2) return s[0] + '*'
  return s[0] + '*'.repeat(s.length - 2) + s[s.length - 1]
}

/**
 * 전화번호 — 가운데 국번을 가리고 뒤 4자리는 남긴다(대조에 필요).
 *
 * 010-1234-5678 → 010-****-5678 · 01012345678 → 010-****-5678 · 02-123-4567 → 02-***-4567
 * 형식을 모르면 뒤 4자리만 남기고 전부 가린다.
 */
export const maskPhone = (value: string): string => {
  if (isBlank(value)) return value
  const s = value.trim()

  const parts = s.split('-')
  if (parts.length === 3 && parts.every((p) => p.length > 0)) {
    return `${parts[0]}-${'*'.repeat(parts[1].length)}-${parts[2]}`
  }

  const digits = s.replace(/\D/g, '')
  // 지역번호(2~3) + 국번 + 4 → 9자리 이상이어야 '앞3-가운데-뒤4' 로 나눌 수 있다
  if (digits.length >= 9) {
    return `${digits.slice(0, 3)}-${'*'.repeat(digits.length - 7)}-${digits.slice(-4)}`
  }
  if (digits.length > 4) {
    return '*'.repeat(digits.length - 4) + digits.slice(-4)
  }
  return '*'.repeat(s.length)
}

/**
 * 주민번호 — 뒷자리는 성별 1자리만 남기고 가린다(관행상 최소 기준).
 *
 * 900101-1234567 → 900101-1****** · 9001011234567 → 900101-1******
 * 앞 6자리(생년월일)는 남긴다 — '최소 뒷자리 마스킹' 기준. 형식을 모르면 통째로 가린다.
 */
export const maskJumin = (value: string): string => {
  if (isBlank(value)) return value
  const s = value.trim()
  const digits = s.replace(/\D/g, '')

  if (digits.length >= 7) {
    return `${digits.slice(0, 6)}-${digits[6]}${'*'.repeat(digits.length - 7)}`
  }
  return '*'.repeat(s.length)
}
