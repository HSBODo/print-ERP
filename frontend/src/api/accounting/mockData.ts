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
  insuranceType: '급여1종' | '급여2종' | '미수입금' | '보험' | '보호(100/100)' | '일반' | '환불금'
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
  procedure: string
  category: string
  status: '결제처리' | '결제취소'
  amount: number
  taxable: number
  exempt: number
  paymentMethod: '카드' | '현금' | '현금영수' | '통장'
  acquirer: string
  cardCompany: string
  paymentMode: '단말기' | '수동'
  productName: string
  itemAmounts: Record<VisionItemKey, number>
  registeredBy: string
  registeredAt: string
  paymentMemo: string
}

export const VISION_ITEM_KEYS = [
  '검사비', '수술', 'DNA', 'PRP', 'PIOL렌즈주문', 'D/L', 'D/L용품', 'H/L',
  '올코드라이아이', '올코어아레즈투', '올코어vitc', 'Dr.PNT', '올코어유산균',
  '글라우포뮬러', '플로터포뮬러', '기타', '미분류',
] as const

export type VisionItemKey = typeof VISION_ITEM_KEYS[number]

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

type MedicalSeed = Pick<MedicalReceipt, 'id' | 'receiptDate' | 'chartNo' | 'patientName' | 'doctor'> & Partial<MedicalReceipt>

const medicalReceipt = (seed: MedicalSeed): MedicalReceipt => {
  const base: MedicalReceipt = {
    id: seed.id, receiptDate: seed.receiptDate, chartNo: seed.chartNo, patientName: seed.patientName, doctor: seed.doctor,
    receiptStaff: '수납 A', receiptType: '외래', revenueType: '기타외래', room: '진료실 1', status: '정상',
    receiptTime: '10:00', serialNo: 1, insuranceType: '보험', hundredCopay: 0, hundredUnpaid: 0,
    salaryTotal: 0, claimAmount: 0, copay: 0, nonCovered: 0, totalCopay: 0,
    welfareSupport: 0, disabledSupport: 0, supportAmount: 0, healthLivingExpense: 0, actualPaid: 0,
    discount: 0, discountReason: '', card: 0, cash: 0, transfer: 0, outstanding: 0, refund: 0,
    outstandingOccurred: 0, outstandingRecovered: 0, outstandingCard: 0, outstandingCash: 0,
    outstandingTransfer: 0, refundOccurred: 0, cashReceipt: 0, closed: false,
  }
  const row = { ...base, ...seed }
  row.totalCopay ||= row.copay + row.nonCovered
  row.actualPaid ||= row.card + row.cash + row.transfer
  row.outstandingOccurred ||= row.outstanding
  return row
}

/** 실제 환자 정보가 아닌 프런트 검토 전용 합성 데이터. */
export const MEDICAL_RECEIPT_MOCK: MedicalReceipt[] = [
  medicalReceipt({ id: 'M-001', receiptDate: '2026-08-03', receiptTime: '09:14', chartNo: 'MOCK-1001', patientName: '샘플 고객 01', doctor: '김의사', insuranceType: '보험', salaryTotal: 182000, claimAmount: 128000, copay: 54000, nonCovered: 120000, card: 174000, closed: true }),
  medicalReceipt({ id: 'M-002', receiptDate: '2026-08-05', receiptTime: '10:22', chartNo: 'MOCK-1002', patientName: '샘플 고객 02', doctor: '이의사', receiptType: '외래', insuranceType: '일반', salaryTotal: 95000, claimAmount: 61000, copay: 34000, nonCovered: 250000, discount: 10000, discountReason: '검사 할인', card: 274000, cashReceipt: 274000 }),
  medicalReceipt({ id: 'M-003', receiptDate: '2026-08-08', receiptTime: '11:35', chartNo: 'MOCK-1003', patientName: '샘플 고객 03', doctor: '박의사', receiptStaff: '수납 B', receiptType: '입원', revenueType: '입원', room: '수술실', insuranceType: '급여1종', salaryTotal: 780000, claimAmount: 520000, copay: 260000, nonCovered: 1350000, discount: 50000, card: 1200000, outstanding: 360000 }),
  medicalReceipt({ id: 'M-004', receiptDate: '2026-08-12', receiptTime: '13:48', chartNo: 'MOCK-1004', patientName: '샘플 고객 04', doctor: '최의사', receiptType: '입원', revenueType: '입원외', room: '수술실', insuranceType: '급여2종', salaryTotal: 230000, claimAmount: 140000, copay: 90000, nonCovered: 480000, discount: 20000, cash: 550000, welfareSupport: 20000 }),
  medicalReceipt({ id: 'M-005', receiptDate: '2026-08-17', receiptTime: '14:11', chartNo: 'MOCK-1005', patientName: '샘플 고객 05', doctor: '김의사', insuranceType: '보호(100/100)', salaryTotal: 116000, claimAmount: 76000, copay: 40000, nonCovered: 310000, card: 350000, hundredCopay: 40000 }),
  medicalReceipt({ id: 'M-006', receiptDate: '2026-08-20', receiptTime: '15:06', chartNo: 'MOCK-1006', patientName: '샘플 고객 06', doctor: '이의사', insuranceType: '환불금', status: '취소', serialNo: 98, refund: 180000, refundOccurred: 180000 }),
  medicalReceipt({ id: 'M-007', receiptDate: '2026-08-25', receiptTime: '09:42', chartNo: 'MOCK-1007', patientName: '샘플 고객 07', doctor: '박의사', receiptStaff: '수납 B', receiptType: '입원', revenueType: '입원', room: '수술실', insuranceType: '보험', salaryTotal: 640000, claimAmount: 420000, copay: 220000, nonCovered: 980000, discount: 30000, card: 720000, transfer: 450000, supportAmount: 15000 }),
  medicalReceipt({ id: 'M-008', receiptDate: '2026-08-29', receiptTime: '12:30', chartNo: 'MOCK-1008', patientName: '샘플 고객 08', doctor: '최의사', insuranceType: '일반', salaryTotal: 84000, claimAmount: 51000, copay: 33000, nonCovered: 190000, transfer: 223000, cashReceipt: 223000 }),
  medicalReceipt({ id: 'M-009', receiptDate: '2026-09-01', receiptTime: '10:17', chartNo: 'MOCK-1009', patientName: '샘플 고객 09', doctor: '김의사', insuranceType: '보험', salaryTotal: 142000, claimAmount: 92000, copay: 50000, nonCovered: 420000, discount: 15000, card: 455000, healthLivingExpense: 10000 }),
  medicalReceipt({ id: 'M-010', receiptDate: '2026-09-02', receiptTime: '11:54', chartNo: 'MOCK-1010', patientName: '샘플 고객 10', doctor: '이의사', receiptType: '입원', revenueType: '입원외', room: '수술실', insuranceType: '미수입금', salaryTotal: 520000, claimAmount: 330000, copay: 190000, nonCovered: 870000, discount: 40000, card: 900000, outstanding: 120000 }),
  medicalReceipt({ id: 'M-011', receiptDate: '2026-09-03', receiptTime: '14:25', chartNo: 'MOCK-1011', patientName: '샘플 고객 11', doctor: '박의사', insuranceType: '일반', salaryTotal: 126000, claimAmount: 79000, copay: 47000, nonCovered: 260000, cash: 307000, disabledSupport: 12000 }),
  medicalReceipt({ id: 'M-012', receiptDate: '2026-09-04', receiptTime: '16:02', chartNo: 'MOCK-1012', patientName: '샘플 고객 12', doctor: '최의사', insuranceType: '보험', salaryTotal: 108000, claimAmount: 70000, copay: 38000, nonCovered: 340000, discount: 8000, card: 370000, cash: 100000, outstandingRecovered: 50000, outstandingCard: 50000 }),
]

type VisionSeed = Pick<VisionReceipt, 'id' | 'receiptDate' | 'chartNo' | 'patientName' | 'surgeon' | 'procedure' | 'amount'> &
  Partial<Omit<VisionReceipt, 'itemAmounts'>> & { itemAmounts?: Partial<Record<VisionItemKey, number>> }

const visionReceipt = (seed: VisionSeed): VisionReceipt => {
  const itemAmounts = Object.fromEntries(VISION_ITEM_KEYS.map((key) => [key, 0])) as Record<VisionItemKey, number>
  Object.assign(itemAmounts, seed.itemAmounts)
  if (!seed.itemAmounts) itemAmounts['수술'] = seed.amount
  const base: VisionReceipt = {
    id: seed.id, receiptDate: seed.receiptDate, chartNo: seed.chartNo, patientName: seed.patientName,
    customerGrade: 'R', surgeryDate: seed.receiptDate, surgeon: seed.surgeon,
    procedureRight: seed.procedure, procedureLeft: seed.procedure, counselor: '상담사 A',
    procedure: seed.procedure, category: '수술', status: '결제처리', amount: seed.amount,
    taxable: 0, exempt: seed.amount, paymentMethod: '카드', acquirer: '국민',
    cardCompany: '국민카드', paymentMode: '단말기', productName: '',
    registeredBy: '수납 A', registeredAt: `${seed.receiptDate} 14:00:00`, paymentMemo: '', itemAmounts,
  }
  return { ...base, ...seed, itemAmounts }
}

/** 실제 환자 정보가 아닌 프런트 검토 전용 합성 데이터. */
export const VISION_RECEIPT_MOCK: VisionReceipt[] = [
  visionReceipt({ id: 'V-001', receiptDate: '2026-08-03', chartNo: 'MOCK-2001', patientName: '샘플 고객 21', surgeon: '김원장', counselor: '상담사 A', procedure: 'SMILE PRO', amount: 3200000, acquirer: '국민', cardCompany: 'KB국민카드', paymentMemo: '합성 수술 매출' }),
  visionReceipt({ id: 'V-002', receiptDate: '2026-08-06', chartNo: 'MOCK-2002', patientName: '샘플 고객 22', surgeon: '이원장', counselor: '상담사 B', procedure: 'LASEK', amount: 2100000, paymentMethod: '통장', acquirer: '우리', cardCompany: '', paymentMode: '수동' }),
  visionReceipt({ id: 'V-003', receiptDate: '2026-08-09', chartNo: 'MOCK-2003', patientName: '샘플 고객 23', surgeon: '박원장', procedure: 'EVO ICL', amount: 5800000, acquirer: '신한', cardCompany: '신한카드' }),
  visionReceipt({ id: 'V-004', receiptDate: '2026-08-12', chartNo: 'MOCK-2004', patientName: '샘플 고객 24', surgeon: '김원장', counselor: '상담사 C', procedure: '안구건조 관리', category: '올코드라이아이', productName: '드라이아이 관리', amount: 280000, taxable: 280000, exempt: 0, paymentMethod: '현금영수', acquirer: '', cardCompany: '', paymentMode: '수동', itemAmounts: { 올코드라이아이: 280000 } }),
  visionReceipt({ id: 'V-005', receiptDate: '2026-08-16', chartNo: 'MOCK-2005', patientName: '샘플 고객 25', surgeon: '최원장', counselor: '상담사 B', procedure: 'SMILE PRO+', amount: 3900000, acquirer: '현대', cardCompany: '현대카드' }),
  visionReceipt({ id: 'V-006', receiptDate: '2026-08-18', chartNo: 'MOCK-2006', patientName: '샘플 고객 26', surgeon: '이원장', counselor: '상담사 C', procedure: 'LASIK', status: '결제취소', amount: -2500000, exempt: -2500000, acquirer: '삼성', cardCompany: '삼성카드', itemAmounts: { 수술: -2500000 } }),
  visionReceipt({ id: 'V-007', receiptDate: '2026-08-22', chartNo: 'MOCK-2007', patientName: '샘플 고객 27', surgeon: '박원장', procedure: 'T-ICL', amount: 6400000, paymentMethod: '통장', acquirer: '하나(구외환)', cardCompany: '', paymentMode: '수동' }),
  visionReceipt({ id: 'V-008', receiptDate: '2026-08-28', chartNo: 'MOCK-2008', patientName: '샘플 고객 28', surgeon: '최원장', counselor: '상담사 B', procedure: 'LASEK', amount: 2200000, paymentMethod: '현금', acquirer: '', cardCompany: '', paymentMode: '수동' }),
  visionReceipt({ id: 'V-009', receiptDate: '2026-09-01', chartNo: 'MOCK-2009', patientName: '샘플 고객 29', surgeon: '김원장', procedure: 'SMILE', amount: 3300000, acquirer: '롯데', cardCompany: '롯데카드' }),
  visionReceipt({ id: 'V-010', receiptDate: '2026-09-02', chartNo: 'MOCK-2010', patientName: '샘플 고객 30', surgeon: '이원장', counselor: '상담사 C', procedure: 'ICL', amount: 5900000, acquirer: '국민', cardCompany: 'KB국민카드' }),
  visionReceipt({ id: 'V-011', receiptDate: '2026-09-03', chartNo: 'MOCK-2011', patientName: '샘플 고객 31', surgeon: '박원장', counselor: '상담사 B', procedure: 'DNA', category: 'DNA', productName: 'DNA', amount: 350000, paymentMethod: '현금영수', acquirer: '', cardCompany: '', paymentMode: '수동', itemAmounts: { DNA: 350000 } }),
  visionReceipt({ id: 'V-012', receiptDate: '2026-09-04', chartNo: 'MOCK-2012', patientName: '샘플 고객 32', surgeon: '최원장', procedure: 'SMILE PRO', amount: 4100000, paymentMethod: '통장', acquirer: '우리', cardCompany: '', paymentMode: '수동' }),
]

const SEASONAL_FACTOR = [0.86, 0.92, 1.04, 1.01, 1.08, 1.03, 1.12, 1.06, 0.98, 1.02, 1.09, 1.18]
const YEAR_FACTOR: Record<number, number> = { 2023: 0.78, 2024: 0.87, 2025: 0.95, 2026: 1 }

/** 그래프 구성 검토용 월별 합성 집계. 원본 기획서의 실제 수치를 포함하지 않는다. */
export const MEDICAL_MONTHLY_MOCK: MedicalMonthlyMetric[] = [2023, 2024, 2025, 2026].flatMap((year) =>
  SEASONAL_FACTOR.slice(0, year === 2026 ? 8 : 12).map((season, index) => {
    const growth = YEAR_FACTOR[year] * season
    return {
      year,
      month: index + 1,
      count: Math.round(4_200 * growth),
      net: Math.round(4_450_000_000 * growth),
      claim: Math.round(1_280_000_000 * growth),
      salaryTotal: Math.round(1_670_000_000 * growth),
      nonCovered: Math.round(2_760_000_000 * growth),
    }
  }),
)

/** 그래프 구성 검토용 월별 합성 집계. 원본 기획서의 실제 수치를 포함하지 않는다. */
export const VISION_MONTHLY_MOCK: VisionMonthlyMetric[] = [2023, 2024, 2025, 2026].flatMap((year) =>
  SEASONAL_FACTOR.slice(0, year === 2026 ? 8 : 12).map((season, index) => {
    const growth = YEAR_FACTOR[year] * season
    return {
      year,
      month: index + 1,
      count: Math.round(2_750 * growth),
      amount: Math.round(2_580_000_000 * growth),
    }
  }),
)
