/**
 * 예약통계 셀 손보정 이력 1건 — 시력교정/백내장 공통 스키마(동일 shape).
 * 화면 마커·툴팁·값 되돌리기 판단에 사용.
 */
export interface StatsCellEdit {
  field: string
  value: number
  editedBy: string
  editedAt: string
}

/** 수기 보정 셀 툴팁 문자열(값·수정자·시각). */
export const editMarkTitle = (edit: StatsCellEdit): string =>
  `수기 보정: ${edit.value} (${edit.editedBy}, ${edit.editedAt.replace('T', ' ').slice(0, 16)})`
