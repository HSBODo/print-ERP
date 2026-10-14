import type { DreamlensLedgerRequest, DreamlensLedgerRow } from '../../type/api'

export type LedgerFieldKey = Exclude<
  keyof DreamlensLedgerRow,
  'id' | 'totalRevenue' | 'source'
>

export interface LedgerColumn {
  key: LedgerFieldKey
  label: string
  /** date·number 는 전용 입력, text 는 자유 입력(+suggestions 있으면 datalist 제안). */
  type: 'date' | 'text' | 'number'
  /** datalist 후보 — 강제하지 않고 제안만 한다(장부 표기가 자유로워 select 로 막으면 못 넣는 값이 생긴다). */
  suggestions?: readonly string[]
  /**
   * 입력 상한. 백엔드 DreamlensLedgerRequest 의 @Size · 엔티티 @Column(length) 과 같은 값이어야 한다.
   * 여기서 막지 않으면 길게 붙여넣었을 때 DB 제약에 걸려 원인을 알 수 없는 실패로 보인다.
   */
  maxLength?: number
  width: number
}

/** 텍스트 컬럼 길이 상한 — 백엔드와 공유하는 값이라 한 곳에서 관리한다. */
const LEN = { short: 50, name: 100, long: 200 } as const

export interface LedgerGroup {
  id: string
  label: string
  /** 그룹 헤더 배경 — 시트의 색 구분을 따라간다. */
  headClass: string
  /**
   * 가로 스크롤 시 좌측에 고정할 그룹. 그룹 헤더가 colspan 으로 묶여 있어
   * 그룹 단위로만 고정할 수 있다(한 그룹의 일부 컬럼만 고정하면 헤더가 어긋난다).
   */
  frozen?: boolean
  columns: LedgerColumn[]
}

/* ── datalist 후보 (D/L 장부 2025~2026 실데이터에서 추출) ── */

export const EXAMINERS = [
  '한지희',
  '윤지원',
  '김지은',
  '권성현',
  '권형진',
  '김태현',
  '김종혁',
  '손혜수',
  '이혜인',
  '신동화',
  '이현영',
  '김소진',
  '전해성',
  '정민식',
  '이진수',
  '송동훈',
  '이유성',
  '박승아',
  '안효주',
  '박시연',
  '김종희',
] as const

export const LENS_NAMES = [
  'CRT',
  'Misight',
  'T-CRT',
  'EXTRA',
  'T-LK',
  'LK',
  'C&B B-Toric',
  'LK-T',
  '공막(onefit)',
  'new asph',
  'CH2',
  'XO2',
  '슈퍼비전2 XO2',
  '공막',
] as const

export const LENS_COLORS = ['G', 'R', 'V', 'Y', 'P', 'B'] as const

export const VISIT_TYPES = ['신규', '재진'] as const

/**
 * 구매·배송 표준 표기 5종.
 *
 * ⚠️ 이 컬럼(시트 원본 헤더 '주소')은 값이 두 종류로 섞여 있다.
 *   - 최근 데이터: 구매·배송 구분('본원 재고구매' 등)
 *   - 과거 데이터: 환자 실제 배송 주소(전체 8,004건 중 상당수, 최대 76자)
 * 그래서 아래 5종은 **강제가 아니라 제안**이고, 매칭되지 않는 값(주소 포함)은
 * 원문을 그대로 보존한다. 주소를 범주로 뭉개면 배송지 정보가 사라진다.
 *
 * 구분 값 쪽에는 같은 뜻이 285가지로 흩어져 있었다(띄어쓰기·조사·오타 차이).
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
    // 좌측 고정 구간 — 36컬럼을 가로로 넘길 때 "어느 행인지" 놓치지 않게 날짜~이름을 붙잡아 둔다.
    id: 'customer',
    label: '고객',
    headClass: 'bg-slate-100',
    frozen: true,
    columns: [
      { key: 'entryDate', label: '날짜', type: 'date', width: 116 },
      {
        key: 'visitType',
        label: '진료구분',
        type: 'text',
        suggestions: VISIT_TYPES,
        maxLength: LEN.short,
        width: 88,
      },
      {
        key: 'customerNo',
        label: '고객번호',
        type: 'text',
        maxLength: LEN.short,
        width: 96,
      },
      {
        key: 'customerName',
        label: '이름',
        type: 'text',
        maxLength: LEN.name,
        width: 92,
      },
    ],
  },
  {
    id: 'basic',
    label: '기본 정보',
    headClass: 'bg-slate-100',
    columns: [
      {
        key: 'examiner',
        label: '검사자',
        type: 'text',
        suggestions: EXAMINERS,
        maxLength: LEN.name,
        width: 92,
      },
      // 시트 원본 '주소' — 구매·배송 구분과 실제 배송 주소가 섞여 있어 라벨에 둘 다 담는다.
      {
        key: 'purchaseType',
        label: '주소·구매구분',
        type: 'text',
        suggestions: PURCHASE_TYPES,
        maxLength: LEN.long,
        width: 190,
      },
    ],
  },
  {
    id: 'right',
    label: 'R 렌즈',
    headClass: 'bg-sky-50',
    columns: [
      {
        key: 'rLensName',
        label: '렌즈명',
        type: 'text',
        suggestions: LENS_NAMES,
        maxLength: LEN.name,
        width: 104,
      },
      {
        key: 'rBox',
        label: 'BOX',
        type: 'text',
        maxLength: LEN.short,
        width: 64,
      },
      {
        key: 'rLensSpec',
        label: 'R렌즈',
        type: 'text',
        maxLength: LEN.name,
        width: 140,
      },
      {
        key: 'rColor',
        label: '색상',
        type: 'text',
        suggestions: LENS_COLORS,
        maxLength: LEN.short,
        width: 64,
      },
      {
        key: 'rReturnDate',
        label: '반납&반품날짜(R)',
        type: 'date',
        width: 132,
      },
    ],
  },
  {
    id: 'left',
    label: 'L 렌즈',
    headClass: 'bg-indigo-50',
    columns: [
      {
        key: 'lLensName',
        label: '렌즈명',
        type: 'text',
        suggestions: LENS_NAMES,
        maxLength: LEN.name,
        width: 104,
      },
      {
        key: 'lBox',
        label: 'BOX',
        type: 'text',
        maxLength: LEN.short,
        width: 64,
      },
      {
        key: 'lLensSpec',
        label: 'L렌즈',
        type: 'text',
        maxLength: LEN.name,
        width: 140,
      },
      {
        key: 'lColor',
        label: '색상',
        type: 'text',
        suggestions: LENS_COLORS,
        maxLength: LEN.short,
        width: 64,
      },
      {
        key: 'lReturnDate',
        label: '반납&반품날짜(L)',
        type: 'date',
        width: 132,
      },
    ],
  },
  {
    id: 'revenue',
    label: '매출',
    headClass: 'bg-amber-50',
    columns: [
      { key: 'dlNewRevenue', label: 'D/L 신규', type: 'number', width: 104 },
      {
        key: 'dlRepurchaseRevenue',
        label: 'D/L 재구매',
        type: 'number',
        width: 104,
      },
      { key: 'mNewRevenue', label: 'M 신규', type: 'number', width: 96 },
      {
        key: 'mRepurchaseRevenue',
        label: 'M FU 재구매',
        type: 'number',
        width: 110,
      },
      { key: 'hlNewRevenue', label: 'H/L 신규', type: 'number', width: 96 },
      {
        key: 'hlRepurchaseRevenue',
        label: 'H/L 재구매',
        type: 'number',
        width: 104,
      },
      { key: 'depositRevenue', label: '보증금', type: 'number', width: 92 },
      { key: 'fittingRevenue', label: '피팅비', type: 'number', width: 92 },
      { key: 'supplyRevenue', label: '용품', type: 'number', width: 92 },
      { key: 'treatmentRevenue', label: '진료비', type: 'number', width: 92 },
      // CRM 수납 정가 — 매출 버킷(실수납)과 다르면 할인·분납이 있었다는 뜻. 행 합계 미포함.
      {
        key: 'lensListPrice',
        label: '렌즈 정가(참고)',
        type: 'number',
        width: 110,
      },
    ],
  },
  {
    id: 'recall',
    label: '리콜 관리',
    headClass: 'bg-emerald-50',
    columns: [
      {
        key: 'nextReservation',
        label: '다음예약',
        type: 'text',
        maxLength: LEN.long,
        width: 110,
      },
      {
        key: 'recall1',
        label: '1차 리콜',
        type: 'text',
        maxLength: LEN.long,
        width: 100,
      },
      {
        key: 'recall1Reservation',
        label: '1차 리콜예약',
        type: 'text',
        maxLength: LEN.long,
        width: 110,
      },
      {
        key: 'recall1Absent',
        label: '1차 부재문자',
        type: 'text',
        maxLength: LEN.long,
        width: 110,
      },
      {
        key: 'recall2',
        label: '2차 리콜',
        type: 'text',
        maxLength: LEN.long,
        width: 100,
      },
      {
        key: 'recall2Reservation',
        label: '2차 리콜예약',
        type: 'text',
        maxLength: LEN.long,
        width: 110,
      },
      {
        key: 'recall2Absent',
        label: '2차 부재문자',
        type: 'text',
        maxLength: LEN.long,
        width: 110,
      },
      {
        key: 'recall3',
        label: '3차 리콜',
        type: 'text',
        maxLength: LEN.long,
        width: 100,
      },
      {
        key: 'recall3Reservation',
        label: '3차 리콜예약',
        type: 'text',
        maxLength: LEN.long,
        width: 110,
      },
      {
        key: 'recall3Absent',
        label: '3차 부재문자',
        type: 'text',
        maxLength: LEN.long,
        width: 110,
      },
    ],
  },
]

export const LEDGER_COLUMNS: LedgerColumn[] = LEDGER_GROUPS.flatMap(
  (group) => group.columns,
)

/** 합계행·행 합계에 쓰는 매출 컬럼 키. */
export const REVENUE_KEYS = LEDGER_GROUPS.find(
  (group) => group.id === 'revenue',
)!.columns.map((column) => column.key)

/** datalist 를 컬럼별로 한 번만 렌더하기 위한 고정 id. */
export const suggestionListId = (key: string) => `dl-ledger-suggest-${key}`

/**
 * 좌측 고정 컬럼의 left 오프셋(px). 체크박스 열 폭에서 시작해 컬럼 폭을 누적한다.
 * 폭을 바꾸면 오프셋이 자동으로 따라오므로 값을 두 곳에서 관리하지 않는다.
 */
export function frozenLeftOffsets(
  selectColWidth: number,
): Map<LedgerFieldKey, number> {
  const offsets = new Map<LedgerFieldKey, number>()
  let left = selectColWidth
  for (const group of LEDGER_GROUPS) {
    if (!group.frozen) continue
    for (const column of group.columns) {
      offsets.set(column.key, left)
      left += column.width
    }
  }
  return offsets
}

/** 고정 구간의 마지막 컬럼 — 여기에만 경계선을 그려 어디까지 고정인지 보이게 한다. */
export const LAST_FROZEN_KEY: LedgerFieldKey | undefined = LEDGER_GROUPS.filter(
  (group) => group.frozen,
)
  .flatMap((group) => group.columns)
  .at(-1)?.key

/**
 * 신규 행의 기본값 — 날짜만 오늘로 채우고 나머지는 빈 값.
 *
 * 동적으로 만들지 않고 필드를 전부 적는다. 그래야 컬럼을 추가·개명했을 때
 * 타입 검사에서 걸린다(동적 생성 + 캐스팅이면 런타임 400 으로만 드러난다).
 */
export function emptyRow(today: string): DreamlensLedgerRequest {
  return {
    entryDate: today,
    visitType: null,
    customerNo: null,
    customerName: null,
    examiner: null,
    purchaseType: null,
    rLensName: null,
    rBox: null,
    rLensSpec: null,
    rColor: null,
    rReturnDate: null,
    lLensName: null,
    lBox: null,
    lLensSpec: null,
    lColor: null,
    lReturnDate: null,
    dlNewRevenue: 0,
    dlRepurchaseRevenue: 0,
    mNewRevenue: 0,
    mRepurchaseRevenue: 0,
    hlNewRevenue: 0,
    hlRepurchaseRevenue: 0,
    depositRevenue: 0,
    fittingRevenue: 0,
    supplyRevenue: 0,
    treatmentRevenue: 0,
    lensListPrice: 0,
    nextReservation: null,
    recall1: null,
    recall1Reservation: null,
    recall1Absent: null,
    recall2: null,
    recall2Reservation: null,
    recall2Absent: null,
    recall3: null,
    recall3Reservation: null,
    recall3Absent: null,
  }
}
