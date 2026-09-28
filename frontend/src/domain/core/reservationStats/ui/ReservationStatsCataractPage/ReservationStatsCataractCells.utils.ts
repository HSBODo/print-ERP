import type { CataractStatsCellEdit } from '../../type/api'

/** 수기 보정 셀 툴팁 문자열(값·수정자·시각). */
export const editMarkTitle = (edit: CataractStatsCellEdit): string =>
  `수기 보정: ${edit.value} (${edit.editedBy}, ${edit.editedAt.replace('T', ' ').slice(0, 16)})`
