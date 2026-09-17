/** 진료 수납 내역 1행 — 의사랑(IPLUS) 외래·입원 수납 원장. 백엔드 list_medical_receipt 와 같은 계약. */
export interface MedicalReceipt {
  id: string
  receiptDate: string
  chartNo: string
  patientName: string
  doctor: string
  receiptStaff: string
  receiptType: string
  revenueType: string
  room: string
  status: '정상' | '취소'
  receiptTime: string
  serialNo: number
  insuranceType: string
  hundredCopay: number
  hundredUnpaid: number
  salaryTotal: number
  claimAmount: number
  copay: number
  nonCovered: number
  totalCopay: number
  welfareSupport: number
  disabledSupport: number
  supportAmount: number
  healthLivingExpense: number
  actualPaid: number
  discount: number
  discountReason: string
  card: number
  cash: number
  transfer: number
  outstanding: number
  refund: number
  outstandingOccurred: number
  outstandingRecovered: number
  outstandingCard: number
  outstandingCash: number
  outstandingTransfer: number
  refundOccurred: number
  cashReceipt: number
  closed: boolean
}

/** 진료명 항목 — 백엔드 VisionItemCatalog.ITEMS 와 같은 17종 (JSON 키 정본). */
export const VISION_ITEM_KEYS = [
  '검사비', '수술', 'DNA', 'PRP', 'PIOL렌즈주문', 'D/L', 'D/L용품', 'H/L',
  '올코드라이아이', '올코어아레즈투', '올코어vitc', 'Dr.PNT', '올코어유산균',
  '글라우포뮬러', '플로터포뮬러', '기타', '미분류',
] as const

export type VisionItemKey = typeof VISION_ITEM_KEYS[number]

/** 시력교정 매출 내역 1행 — SOFTCRM 비급여 수납 전표 상세(결제수단별). 취소 전표는 결제취소 행(음수)이 따로 온다. */
export interface VisionReceipt {
  id: string
  receiptDate: string
  chartNo: string
  patientName: string
  customerGrade: string
  surgeryDate: string
  surgeon: string
  procedureRight: string
  procedureLeft: string
  counselor: string
  category: string
  status: '결제처리' | '결제취소'
  amount: number
  taxable: number
  exempt: number
  paymentMethod: string
  acquirer: string
  cardCompany: string
  paymentMode: string
  productName: string
  itemAmounts: Record<string, number>
  registeredBy: string
  registeredAt: string
  paymentMemo: string
}

export interface MedicalMonthlyMetric {
  year: number
  month: number
  count: number
  net: number
  claim: number
  salaryTotal: number
  nonCovered: number
}

export interface VisionMonthlyMetric {
  year: number
  month: number
  count: number
  amount: number
}

/** 마트 적재 현황 — "데이터 기준" 표기. 적재 전이면 null. */
export interface AccountingStatus {
  medicalFrom: string | null
  medicalTo: string | null
  medicalLoadedAt: string | null
  medicalMonthlyFromYear: number | null
  visionFrom: string | null
  visionTo: string | null
  visionLoadedAt: string | null
}

export type MedicalCategory = '전체' | '외래' | '입원' | '백내장'
