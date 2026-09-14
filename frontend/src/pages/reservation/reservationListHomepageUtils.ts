import type { ReservationListHomepageItem } from '@/api/reservation/reservationListHomepage'

/**
 * ReservationListHomepagePage 전용 순수 로직/상수 (렌더 무관).
 * 컬럼/뱃지 등 JSX 렌더 설정은 reservationListHomepageColumns.tsx 참조.
 *
 * 라벨 매핑 근거: 레거시 PHP 원본(counsel/online_list.php). 코드표 조인이 아니라
 * if/else 하드코딩이라 DB만 봐서는 알 수 없다 — 원본에서 그대로 옮겨온 값이다.
 */

export type PeriodMode = 'daily' | 'monthly'
export type SortDirection = 'asc' | 'desc'
export type SortState = { key: string; direction: SortDirection } | null

/* ── 표시 헬퍼 ── */
export const dash = (v: string) => (v && v.trim() ? v : '—')
export const formatCount = (count: number) => count.toLocaleString('ko-KR')

/** 구분 — 레거시 컬럼명 DIVICE_TYPE(오타가 원본 그대로다) 코드 → 화면 라벨. */
export const DEVICE_TYPE_LABELS: Record<string, string> = {
  P: 'PC',
  M: 'Mobile',
  AI_P: 'AI PC',
  AI_M: 'AI Mobile',
}
export const formatDeviceType = (v: string) => DEVICE_TYPE_LABELS[v.trim()] ?? v

/**
 * 진료구분 — 레거시 PHP if/else 하드코딩을 그대로 옮긴 것.
 * 코드 '1'(전체 59건)은 레거시에도 분기가 없어 화면에 빈칸으로 나온다.
 * 의미가 확인되기 전까지 레거시와 동일하게 빈칸으로 둔다(임의 라벨을 지어내지 않는다).
 */
export const EXAM_TYPE_LABELS: Record<string, string> = {
  '5': '시력교정수술 전 검사',
  '2': '백내장검사',
  '21': '노안검사',
  '24': '렌즈삽입수술 전 검사',
  '25': '렌즈삽입수술 전 검사',
}
export const formatExamType = (v: string) => EXAM_TYPE_LABELS[v.trim()] ?? ''

/** 예약상태 — ISRESERVE. Y=예약 / N=취소. */
export const formatReserveState = (v: string) =>
  v.trim() === 'Y' ? '예약' : v.trim() === 'N' ? '취소' : ''

/** 당일수술 — SURGERY_TF. Y 일 때만 표기(빈값 990건 존재). */
export const formatSurgeryTf = (v: string) => (v.trim() === 'Y' ? '당일수술' : '')

/* ── 필터 옵션 (레거시 화면 동일) ── */
export const DEVICE_FILTER_OPTIONS = [
  { value: '전체', label: '전체' },
  { value: 'P', label: 'PC' },
  { value: 'M', label: 'Mobile' },
  { value: 'AI_P', label: 'AI PC' },
  { value: 'AI_M', label: 'AI Mobile' },
]

export const RESERVE_FILTER_OPTIONS = [
  { value: '전체', label: '전체' },
  { value: 'Y', label: '예약' },
  { value: 'N', label: '취소' },
]

export const PAGE_SIZE_OPTIONS = [20, 50, 100, 200]
/** 레거시 nPageSize 기본값과 동일. */
export const DEFAULT_PAGE_SIZE = 20
export const SKELETON_ROWS = 20

/* ── 기간 ── */
const pad = (n: number) => String(n).padStart(2, '0')

export const todayIso = () => {
  const now = new Date()
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export const monthStartOf = (iso: string) => `${iso.slice(0, 7)}-01`

/** 기본 조회 기간 = 이번 달 1일 ~ 오늘. (상수가 아니라 함수 — 탭을 오래 켜둬도 안 낡는다) */
export const defaultTo = () => todayIso()
export const defaultFrom = () => monthStartOf(todayIso())

/* ── 월별 모드 (검사자·수술자 리스트와 동일한 헬퍼) ── */
/** 'YYYY-MM-DD' → 'YYYY-MM' (input[type=month] 값) */
export const toMonthValue = (date: string) => date.slice(0, 7)

/** 'YYYY-MM' → 그 달 1일 */
export const toMonthStart = (month: string) => `${month}-01`

/**
 * 'YYYY-MM' → 그 달 말일. 단 **진행 중인 달은 오늘까지만** 자른다.
 * 미래 날짜로 조회하면 스냅샷 소스에서 '천장 초과' 거짓 경고가 뜨기 때문이다
 * (예약자 리스트의 monthRange 와 같은 처리).
 */
export const toMonthEnd = (month: string) => {
  const [year, monthNumber] = month.split('-').map(Number)
  const lastDate = new Date(year, monthNumber, 0).getDate()
  const end = `${month}-${String(lastDate).padStart(2, '0')}`
  const today = todayIso()
  return end > today ? today : end
}

/**
 * 조회 종료일이 스냅샷 마지막 등록일시를 넘는지. 넘으면 그 구간은 소스에 없어
 * 건수가 조용히 모자라게 나온다(가이드 문서 §0 / 6장 참조) → 화면에 경고를 띄운다.
 * lastRegDate 형식: 'YYYY-MM-DD HH:MM:SS'.
 */
export const isRangeBeyondSnapshot = (to: string, lastRegDate: string) => {
  if (!to || !lastRegDate) return false
  return to > lastRegDate.slice(0, 10)
}

/* ── 검색/정렬 ── */
/**
 * 이름·휴대폰번호 통합 검색 — 다른 리스트 화면과 동일하게 단일 입력으로 전 필드를 훑는다.
 * (레거시의 검색조건 select 는 두지 않는다. 제목·내용이 전 행 고정/빈값이라 무의미했고,
 *  이름/휴대폰은 서로 값이 겹치지 않아 필드를 좁힐 실익이 없다.)
 */
export const matchesSearch = (row: ReservationListHomepageItem, keyword: string) => {
  const q = keyword.trim().toLowerCase()
  if (!q) return true

  // 하이픈 유무와 무관하게 찾히도록 숫자만 남겨 비교(원문에 010-1234-5678 / 01012345678 혼재).
  const digits = (v: string) => v.replace(/\D/g, '')
  const phoneHit = digits(q).length > 0 && digits(row.phone).includes(digits(q))

  return row.name.toLowerCase().includes(q) || phoneHit
}

export const buildPaginationItems = (currentPage: number, pageMax: number): Array<number | string> => {
  if (pageMax <= 7) {
    return Array.from({ length: pageMax }, (_, index) => index + 1)
  }

  const pages = new Set([1, pageMax, currentPage - 1, currentPage, currentPage + 1])
  const normalized = [...pages]
    .filter((page) => page >= 1 && page <= pageMax)
    .sort((a, b) => a - b)

  return normalized.reduce<Array<number | string>>((items, page, index) => {
    const prev = normalized[index - 1]
    if (prev && page - prev > 1) items.push(`ellipsis-${prev}-${page}`)
    items.push(page)
    return items
  }, [])
}

export const getSortValue = (
  row: ReservationListHomepageItem,
  key: string,
  originalIndex: number,
) => {
  if (key === 'rowNo') return originalIndex
  if (key === 'deviceType') return formatDeviceType(row.deviceType)
  if (key === 'examType') return formatExamType(row.examType)
  if (key === 'isReserve') return formatReserveState(row.isReserve)
  if (key === 'surgeryTf') return formatSurgeryTf(row.surgeryTf)
  if (key === 'utm') return `${row.utmSource} ${row.utmMedium} ${row.utmCampaign}`.trim()

  return String(row[key as keyof ReservationListHomepageItem] ?? '').trim()
}

export const compareSortValue = (a: string | number | null, b: string | number | null) => {
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
