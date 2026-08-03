import type { DreamlensLedgerRow } from '@/api/etc'

export type LedgerFieldKey = Exclude<keyof DreamlensLedgerRow, 'id' | 'totalRevenue'>

export type LedgerColumn = {
  key: LedgerFieldKey
  label: string
  /** date·number 는 전용 입력, text 는 자유 입력(+suggestions 있으면 datalist 제안). */
  type: 'date' | 'text' | 'number'
  /** datalist 후보 — 강제하지 않고 제안만 한다(장부 표기가 자유로워 select 로 막으면 못 넣는 값이 생긴다). */
  suggestions?: readonly string[]
  width: number
}

export type LedgerGroup = {
  id: string
  label: string
  /** 그룹 헤더 배경 — 시트의 색 구분을 따라간다. */
  headClass: string
  columns: LedgerColumn[]
}

/* ── datalist 후보 (D/L 장부 2025~2026 실데이터에서 추출) ── */

export const EXAMINERS = [
  '한지희', '윤지원', '김지은', '권성현', '권형진', '김태현', '김종혁',
  '손혜수', '이혜인', '신동화', '이현영', '김소진', '전해성', '정민식',
  '이진수', '송동훈', '이유성', '박승아', '안효주', '박시연', '김종희',
] as const

export const LENS_NAMES = [
  'CRT', 'Misight', 'T-CRT', 'EXTRA', 'T-LK', 'LK', 'C&B B-Toric',
  'LK-T', '공막(onefit)', 'new asph', 'CH2', 'XO2', '슈퍼비전2 XO2', '공막',
] as const

export const LENS_COLORS = ['G', 'R', 'V', 'Y', 'P', 'B'] as const

export const VISIT_TYPES = ['신규', '재진'] as const

/**
 * 구매·배송 표준 표기 5종.
 *
 * 기존 시트에는 같은 뜻이 285가지로 흩어져 있었다(띄어쓰기·조사·오타 차이).
 *   재고구매 계열 — '본원 재고구매' / '본원 재고 구매' / '본원재고구매' / '본원 재고수령' …
 *   본원수령 계열 — '본원배송(본원수령희망)' / '본원 배송(본원 수령)' / '본원배송(본원수령)' …
 *   택배 계열     — '본원 배송(택배 희망)' / '본원배송(택배발송희망)' / '본원배송(텍배배송희망)'(오타) …
 *   대여 계열     — '대여렌즈' / '본원대여렌즈' / '본원 렌즈 대여' / '본원TR 대여렌즈' …
 *   용품 계열     — '용품만 구매' / '용품구매' / '용품만구매' / '용품 구매'
 * 집계·필터가 불가능한 상태라 아래 5종으로 통일한다. 자유 입력은 계속 허용하므로
 * 예외 케이스는 그대로 적을 수 있다(datalist 는 제안일 뿐 강제가 아니다).
 */
export const PURCHASE_TYPES = [
  '본원 재고구매',
  '본원 배송(본원수령)',
  '본원 배송(택배발송)',
  '본원 대여렌즈',
  '용품 구매',
] as const

/* ── 컬럼 정의 (시트 순서 그대로 36개) ── */

export const LEDGER_GROUPS: LedgerGroup[] = [
  {
    id: 'basic',
    label: '기본 정보',
    headClass: 'bg-slate-100',
    columns: [
      { key: 'entryDate', label: '날짜', type: 'date', width: 116 },
      { key: 'visitType', label: '진료구분', type: 'text', suggestions: VISIT_TYPES, width: 88 },
      { key: 'customerNo', label: '고객번호', type: 'text', width: 96 },
      { key: 'customerName', label: '이름', type: 'text', width: 92 },
      { key: 'examiner', label: '검사자', type: 'text', suggestions: EXAMINERS, width: 92 },
      { key: 'purchaseType', label: '구매·배송', type: 'text', suggestions: PURCHASE_TYPES, width: 160 },
    ],
  },
  {
    id: 'right',
    label: 'R 렌즈',
    headClass: 'bg-sky-50',
    columns: [
      { key: 'rLensName', label: '렌즈명', type: 'text', suggestions: LENS_NAMES, width: 104 },
      { key: 'rBox', label: 'BOX', type: 'text', width: 64 },
      { key: 'rLensSpec', label: 'R렌즈', type: 'text', width: 140 },
      { key: 'rColor', label: '색상', type: 'text', suggestions: LENS_COLORS, width: 64 },
      { key: 'rReturnDate', label: '반납&반품날짜(R)', type: 'date', width: 132 },
    ],
  },
  {
    id: 'left',
    label: 'L 렌즈',
    headClass: 'bg-indigo-50',
    columns: [
      { key: 'lLensName', label: '렌즈명', type: 'text', suggestions: LENS_NAMES, width: 104 },
      { key: 'lBox', label: 'BOX', type: 'text', width: 64 },
      { key: 'lLensSpec', label: 'L렌즈', type: 'text', width: 140 },
      { key: 'lColor', label: '색상', type: 'text', suggestions: LENS_COLORS, width: 64 },
      { key: 'lReturnDate', label: '반납&반품날짜(L)', type: 'date', width: 132 },
    ],
  },
  {
    id: 'revenue',
    label: '매출',
    headClass: 'bg-amber-50',
    columns: [
      { key: 'dlNewRevenue', label: 'D/L 신규', type: 'number', width: 104 },
      { key: 'dlRepurchaseRevenue', label: 'D/L 재구매', type: 'number', width: 104 },
      { key: 'mNewRevenue', label: 'M 신규', type: 'number', width: 96 },
      { key: 'mRepurchaseRevenue', label: 'M FU 재구매', type: 'number', width: 110 },
      { key: 'hlNewRevenue', label: 'H/L 신규', type: 'number', width: 96 },
      { key: 'hlRepurchaseRevenue', label: 'H/L 재구매', type: 'number', width: 104 },
      { key: 'depositRevenue', label: '보증금', type: 'number', width: 92 },
      { key: 'fittingRevenue', label: '피팅비', type: 'number', width: 92 },
      { key: 'supplyRevenue', label: '용품', type: 'number', width: 92 },
      { key: 'treatmentRevenue', label: '진료비', type: 'number', width: 92 },
    ],
  },
  {
    id: 'recall',
    label: '리콜 관리',
    headClass: 'bg-emerald-50',
    columns: [
      { key: 'nextReservation', label: '다음예약', type: 'text', width: 110 },
      { key: 'recall1', label: '1차 리콜', type: 'text', width: 100 },
      { key: 'recall1Reservation', label: '1차 리콜예약', type: 'text', width: 110 },
      { key: 'recall1Absent', label: '1차 부재문자', type: 'text', width: 110 },
      { key: 'recall2', label: '2차 리콜', type: 'text', width: 100 },
      { key: 'recall2Reservation', label: '2차 리콜예약', type: 'text', width: 110 },
      { key: 'recall2Absent', label: '2차 부재문자', type: 'text', width: 110 },
      { key: 'recall3', label: '3차 리콜', type: 'text', width: 100 },
      { key: 'recall3Reservation', label: '3차 리콜예약', type: 'text', width: 110 },
      { key: 'recall3Absent', label: '3차 부재문자', type: 'text', width: 110 },
    ],
  },
]

export const LEDGER_COLUMNS: LedgerColumn[] = LEDGER_GROUPS.flatMap((group) => group.columns)

/** 합계행·행 합계에 쓰는 매출 컬럼 키. */
export const REVENUE_KEYS = LEDGER_GROUPS
  .find((group) => group.id === 'revenue')!
  .columns.map((column) => column.key)

/** datalist 를 컬럼별로 한 번만 렌더하기 위한 고정 id. */
export const suggestionListId = (key: string) => `dl-ledger-suggest-${key}`

/** 신규 행의 기본값 — 날짜만 오늘로 채우고 나머지는 빈 값. */
export function emptyRow(today: string): Record<LedgerFieldKey, string | number | null> {
  const row = {} as Record<LedgerFieldKey, string | number | null>
  for (const column of LEDGER_COLUMNS) {
    row[column.key] = column.type === 'number' ? 0 : null
  }
  row.entryDate = today
  return row
}
