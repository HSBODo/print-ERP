import type { SurgeryListItem } from '../../type/api'

/** SurgeryListPage 전용 순수 로직/상수 (렌더 무관). 컬럼 설정은 surgeryListColumns.tsx. */

export type SortDirection = 'asc' | 'desc'
export type SortState = { key: string; direction: SortDirection } | null

export const dash = (v: string) => (v && v.trim() ? v : '—')

export const calcAge = (birth: string) => {
  if (!/^\d{4}-\d{2}-\d{2}/.test(birth)) return '—'
  const b = new Date(birth)
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age -= 1
  return age >= 0 && age < 130 ? String(age) : '—'
}

export const CATEGORY_OPTIONS = ['전체', '시력교정', '백내장', '재수술']
export const SKELETON_ROWS = 50

export const formatCount = (count: number) => count.toLocaleString('ko-KR')

export const getSortValue = (
  row: SurgeryListItem,
  key: string,
  originalIndex: number,
) => {
  if (key === 'rowNo') return originalIndex
  if (key === 'age') {
    const age = Number(calcAge(row.birth))
    return Number.isFinite(age) ? age : null
  }
  return String(row[key as keyof SurgeryListItem] ?? '').trim()
}

/**
 * 재수술 후보(자동 포함분)를 수술자 리스트 행 형태로 변환 — '재수술' 카테고리 필터용.
 * RE_OPERATION 출처라 채워지는 값은 수술일(=재수술일)·차트번호·고객명·수술방법 R/L 뿐(나머지는 공란).
 */
const BLANK_SURGERY_ROW: SurgeryListItem = {
  chartNo: '',
  name: '',
  nameEng: '',
  surgeryCategory: '',
  surgeryDate: '',
  examDate: '',
  patientType: '',
  surgeryReserveDate: '',
  surgeryRegDate: '',
  surgeryTime: '',
  surgeryR: '',
  surgeryL: '',
  recommendedR: '',
  recommendedL: '',
  estimate: '',
  surgeryRate: '',
  payment: '',
  surgeon: '',
  counselor: '',
  doctor: '',
  optometrist: '',
  birth: '',
  lunar: '',
  phone1: '',
  phone2: '',
  email: '',
  zip: '',
  addr1: '',
  addr2: '',
  memo: '',
  grade: '',
  job: '',
  lastVisit: '',
  route: '',
  section: '',
  motiveL: '',
  motiveM: '',
  motiveS: '',
  motiveMemo: '',
  examMemo: '',
  insurance: '',
  nationality: '',
}

export const reopCandidateToRow = (c: {
  chartNo: string
  name: string
  nameEng: string
  patientType: string
  surgeon: string
  payment: string
  reopDate: string
  againR: string
  againL: string
}): SurgeryListItem => ({
  ...BLANK_SURGERY_ROW,
  chartNo: c.chartNo,
  name: c.name,
  nameEng: c.nameEng,
  patientType: c.patientType,
  surgeon: c.surgeon,
  payment: c.payment,
  surgeryCategory: '재수술',
  surgeryDate: c.reopDate,
  surgeryR: c.againR,
  surgeryL: c.againL,
})

/* ────────────────────────────────────────────────────────────
 * 수술 유형 필터 — 수술별 비중 표(/stats/surgery-composition)의 항목과 같은 구성.
 *
 * 분류 키워드는 백엔드 SQL 과 같은 규칙이다. 바꿀 때 반드시 같이 고칠 것:
 *   sql/surgery/find-vision-{daily,monthly}-by-type.sql
 *   sql/surgery/find-cataract-{daily,monthly}-by-type.sql
 *   sql/surgery/find-reoperation-candidates.sql (렌즈/레이저)
 *
 * ⚠️ 운영 DB 컬레이션이 Korean_Wansung_CI_AS(대소문자 구분 안 함)라 SQL 의 LIKE 도
 *    대소문자를 안 가린다. 여기서도 소문자로 낮춰 비교해 동작을 맞춘다.
 *
 * ⚠️ PIOL 필터는 "그 렌즈를 **받은** 사람"을 고른다. 비중 표의 PIOL 유형별은 환자당
 *    대표유형(우안 우선) 하나만 세므로 **두 숫자는 다를 수 있다**
 *    (2026-07 ICL: 받은 사람 44명 / 대표유형 41명). 리스트는 사람을 찾는 화면이라
 *    "받은 사람" 기준이 자연스럽다.
 * ──────────────────────────────────────────────────────────── */

/**
 * 시력교정 유형 — PIOL 5종을 따로 두지 않고 한 줄에 펼친다.
 * (그룹을 나누면 라벨까지 붙어 필터 바가 두 줄로 접혔다)
 */
export const SURGERY_TYPE_FILTERS = [
  '전체',
  '스마일',
  '스마일프로',
  'ICL',
  'T-ICL',
  'KPL',
  'T-KPL',
  'VIVA',
  'PRESBYOND',
  '라식계',
  '라섹계',
] as const
export const OPTION_FILTERS = [
  '전체',
  '엑스트라',
  '퍼스널',
  '콘트라',
  '웨이브',
  '모노',
] as const
export const CATARACT_FILTERS = [
  '전체',
  '다초점',
  '프리미엄',
  '단초점',
] as const
export const REOP_FILTERS = ['전체', '레이저', '렌즈'] as const

export type VisionType =
  | 'presbyond'
  | 'smilePro'
  | 'smile'
  | 'viva'
  | 'tIcl'
  | 'icl'
  | 'tKpl'
  | 'kpl'
  | 'lasik'
  | 'lasek'
  | 'other'

const has = (raw: string, ...keys: string[]) => {
  const s = (raw ?? '').toLowerCase()
  return keys.some((k) => s.includes(k.toLowerCase()))
}

/** 수술명 한 건(한쪽 눈)의 시력교정 유형. SQL CASE 와 판정 순서까지 같아야 한다. */
export function classifyVision(raw: string): VisionType {
  if (!raw?.trim()) return 'other'
  if (has(raw, 'PRESBYOND')) return 'presbyond'
  if (has(raw, 'SMILE Pro', 'SMILEpro', 'SMILE PRO')) return 'smilePro'
  if (has(raw, 'SMILE')) return 'smile'
  if (has(raw, 'VIVA')) return 'viva'
  if (has(raw, 'T-ICL', 'T-IPCL', 'T-GLAZE', 'T-ECHO')) return 'tIcl'
  if (has(raw, 'ICL', 'IPCL', 'ARF', 'ART', 'ARTIFLEX', 'GLAZE', 'ECHO'))
    return 'icl'
  if (has(raw, 'T-KPL')) return 'tKpl'
  if (has(raw, 'KPL')) return 'kpl'
  if (has(raw, 'FLAP LIFT', 'OPTI', 'iFS', 'VISU', 'fs200', 'Micro+', 'Hybrid'))
    return 'lasik'
  if (has(raw, 'EYECLE', 'T-prk', 'EYE CLE', 'EYE+', 'FLAP PRK', 'PtK', 'M-LE'))
    return 'lasek'
  return 'other'
}

export type CataractType = 'catEdof' | 'catMulti' | 'catMono'

/** EDOF 를 먼저 본다 — `T-Clareon Vivity` 처럼 두 목록에 다 걸리는 이름이 있다. */
export function classifyCataract(raw: string): CataractType {
  if (has(raw, 'EDOF', 'Vivity', 'Eyhance', 'PureSee', 'Isopure', 'Symfony'))
    return 'catEdof'
  if (
    has(
      raw,
      'Clareon',
      'Panoptix',
      'RESTOR',
      'Lara',
      'LISA',
      'CTR(M)',
      'CTRmulti',
      '3PodF',
      'T-CTR',
      'T-CATARACT',
      'Precizon',
      'LAL',
      'ELANA',
      'Gemetric',
    )
  )
    return 'catMulti'
  return 'catMono'
}

export function classifyReoperation(raw: string): 'reopLens' | 'reopLaser' {
  return has(
    raw,
    'remo',
    'exch',
    'ICL',
    'ARF',
    'ART',
    'EVO',
    'ECHO',
    'GLAZE',
    'precizon',
    'Lisa',
    'Gemetric',
    'encla',
  )
    ? 'reopLens'
    : 'reopLaser'
}

const VISION_BY_LABEL: Record<string, VisionType> = {
  스마일: 'smile',
  스마일프로: 'smilePro',
  ICL: 'icl',
  'T-ICL': 'tIcl',
  KPL: 'kpl',
  'T-KPL': 'tKpl',
  VIVA: 'viva',
  PRESBYOND: 'presbyond',
  라식계: 'lasik',
  라섹계: 'lasek',
}
const CATARACT_BY_LABEL: Record<string, CataractType> = {
  다초점: 'catMulti',
  프리미엄: 'catEdof',
  단초점: 'catMono',
}
const OPTION_BY_LABEL: Record<string, (raw: string) => boolean> = {
  엑스트라: (r) => has(r, '+X'),
  퍼스널: (r) => has(r, 'P.E'),
  콘트라: (r) => has(r, 'CONT'),
  웨이브: (r) => has(r, 'W.V'),
  모노: (r) => (r ?? '').trim().toLowerCase().startsWith('mono'),
}

export interface SurgeryFilterRow {
  surgeryR: string
  surgeryL: string
}

/** 좌·우 중 한쪽이라도 만족하면 그 행은 해당한다(양안에 다른 수술을 하는 경우가 흔하다). */
const eitherEye = (row: SurgeryFilterRow, ok: (raw: string) => boolean) =>
  ok(row.surgeryR ?? '') || ok(row.surgeryL ?? '')

/** 값이 빈 눈은 수술하지 않은 눈이라 분류 대상에서 뺀다(빈 문자열이 단초점·레이저로 떨어지는 걸 막는다). */
const filled = (raw: string) => Boolean(raw && raw.trim())

export function matchesSurgeryType(
  row: SurgeryFilterRow,
  filter: string,
): boolean {
  if (filter === '전체') return true
  const type = VISION_BY_LABEL[filter]
  if (!type) return true
  return eitherEye(row, (raw) => classifyVision(raw) === type)
}

export function matchesOption(row: SurgeryFilterRow, filter: string): boolean {
  if (filter === '전체') return true
  const ok = OPTION_BY_LABEL[filter]
  if (!ok) return true
  return eitherEye(row, ok)
}

export function matchesCataract(
  row: SurgeryFilterRow,
  filter: string,
): boolean {
  if (filter === '전체') return true
  const type = CATARACT_BY_LABEL[filter]
  if (!type) return true
  return eitherEye(row, (raw) => filled(raw) && classifyCataract(raw) === type)
}

export function matchesReoperation(
  row: SurgeryFilterRow,
  filter: string,
): boolean {
  if (filter === '전체') return true
  const want = filter === '렌즈' ? 'reopLens' : 'reopLaser'
  return eitherEye(
    row,
    (raw) => filled(raw) && classifyReoperation(raw) === want,
  )
}

export const compareSortValue = (
  a: string | number | null,
  b: string | number | null,
) => {
  const aEmpty = a === null || a === ''
  const bEmpty = b === null || b === ''
  if (aEmpty && bEmpty) return 0
  if (aEmpty) return 1
  if (bEmpty) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'ko-KR', {
    numeric: true,
    sensitivity: 'base',
  })
}
