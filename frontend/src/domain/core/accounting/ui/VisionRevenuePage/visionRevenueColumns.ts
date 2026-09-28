import { VISION_ITEM_KEYS, type VisionItemKey, type VisionReceipt } from '../../type/accounting'

type DirectKey = Exclude<keyof VisionReceipt, 'itemAmounts'>
export type VisionColumnKey = DirectKey | '__no' | `item:${VisionItemKey}`
export type VisionColumnKind = 'no' | 'text' | 'center' | 'status' | 'number' | 'derived'
export interface VisionColumn { key: VisionColumnKey; label: string; kind: VisionColumnKind }

export const VISION_COLUMNS: VisionColumn[] = [
  { key: '__no', label: 'No', kind: 'no' },
  { key: 'receiptDate', label: '수납일자', kind: 'text' },
  { key: 'chartNo', label: '고객번호', kind: 'center' },
  { key: 'patientName', label: '고객명', kind: 'text' },
  { key: 'customerGrade', label: '등급', kind: 'center' },
  { key: 'surgeryDate', label: '수술일자', kind: 'center' },
  { key: 'surgeon', label: '집도의', kind: 'text' },
  { key: 'procedureRight', label: '수술방법R', kind: 'text' },
  { key: 'procedureLeft', label: '수술방법L', kind: 'text' },
  { key: 'counselor', label: '상담사', kind: 'text' },
  { key: 'status', label: '수납상태', kind: 'status' },
  { key: 'amount', label: '수납금액', kind: 'number' },
  { key: 'taxable', label: '과세', kind: 'derived' },
  { key: 'exempt', label: '면세', kind: 'derived' },
  { key: 'paymentMethod', label: '수납방법', kind: 'center' },
  { key: 'acquirer', label: '매입사', kind: 'center' },
  { key: 'cardCompany', label: '카드사', kind: 'center' },
  { key: 'paymentMode', label: '수납모드', kind: 'center' },
  { key: 'category', label: '진료구분', kind: 'center' },
  { key: 'productName', label: '제품명', kind: 'text' },
  ...VISION_ITEM_KEYS.map((key): VisionColumn => ({
    key: `item:${key}`,
    label: key === 'D/L용품' ? 'D/L 용품' : key,
    kind: 'number',
  })),
  { key: 'registeredBy', label: '수납등록자', kind: 'text' },
  { key: 'registeredAt', label: '수납등록일자', kind: 'center' },
  { key: 'paymentMemo', label: '결제메모', kind: 'text' },
]

const itemKey = (key: VisionColumnKey) => key.toString().startsWith('item:')
  ? key.toString().slice(5) as VisionItemKey
  : null

export const visionCellValue = (row: VisionReceipt, key: VisionColumnKey): string | number => {
  if (key === '__no') return 0
  const item = itemKey(key)
  if (item) return row.itemAmounts[item] ?? 0
  const value = row[key as DirectKey]
  return typeof value === 'number' ? value : String(value)
}

export const visionNumericValue = (row: VisionReceipt, key: VisionColumnKey): number => {
  const value = visionCellValue(row, key)
  return typeof value === 'number' ? value : 0
}
