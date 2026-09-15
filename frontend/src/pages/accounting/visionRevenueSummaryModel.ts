import type { VisionReceipt } from '@/api/accounting'

export const VISION_SUMMARY_ACQUIRERS = [
  '국민', '농협', '롯데', '비씨', '삼성', '신한', '우리', '하나(구외환)',
  '현대', '제로페이', '나이스정보통신',
] as const

/**
 * key = itemAmounts 의 진료명 키. '선결제' 처럼 레거시 피벗에만 있고 마트 항목에는 없는 줄은 항상 0 으로 남아
 * 회계법인 표와 한 줄씩 맞대볼 수 있게 자리를 지킨다. kind 'count' 는 값 없는 개수 집계 줄.
 */
export interface VisionSummaryRowDefinition {
  label: string
  key?: string
  kind: 'free' | 'count' | 'taxed'
}

export const VISION_SUMMARY_ROWS: VisionSummaryRowDefinition[] = [
  { label: '수술', key: '수술', kind: 'free' },
  { label: '선결제', key: '선결제', kind: 'free' },
  { label: 'PIOL렌즈주문', key: 'PIOL렌즈주문', kind: 'free' },
  { label: 'PRP', key: 'PRP', kind: 'free' },
  { label: '검사비', key: '검사비', kind: 'free' },
  { label: 'DNA', key: 'DNA', kind: 'free' },
  { label: '기타', key: '기타', kind: 'free' },
  { label: 'D/L', key: 'D/L', kind: 'free' },
  { label: 'D/L 용품', key: 'D/L용품', kind: 'free' },
  { label: 'H/L', key: 'H/L', kind: 'free' },
  { label: '미분류', key: '미분류', kind: 'free' },
  { label: '패키지', kind: 'count' },
  { label: '보안경', kind: 'count' },
  { label: '키즈아이', kind: 'count' },
  { label: '올코어아레즈투', key: '올코어아레즈투', kind: 'taxed' },
  { label: '올코어vitc', key: '올코어vitc', kind: 'taxed' },
  { label: '올코드라이아이', key: '올코드라이아이', kind: 'taxed' },
  { label: 'Dr.PNT', key: 'Dr.PNT', kind: 'taxed' },
  { label: '올코어유산균', key: '올코어유산균', kind: 'taxed' },
  { label: '글라우포뮬러', key: '글라우포뮬러', kind: 'taxed' },
  { label: '플로터포뮬러', key: '플로터포뮬러', kind: 'taxed' },
]

export interface VisionRevenueSummary {
  columns: string[]
  cells: Record<string, Record<string, number>>
  columnTotals: Record<string, number>
  freeTotals: Record<string, number>
  taxedTotals: Record<string, number>
  count: number
}

const paymentBucket = (row: VisionReceipt): string =>
  row.paymentMethod === '카드' ? row.acquirer || '(미상)' : '현금'

const emptyAmounts = (columns: string[]): Record<string, number> =>
  Object.fromEntries(columns.map((column) => [column, 0]))

export const buildVisionRevenueSummary = (rows: VisionReceipt[]): VisionRevenueSummary => {
  const known = new Set<string>(['현금', ...VISION_SUMMARY_ACQUIRERS])
  const extras = [...new Set(rows.map(paymentBucket).filter((bucket) => !known.has(bucket)))].sort((a, b) => a.localeCompare(b, 'ko'))
  const columns = ['현금', ...VISION_SUMMARY_ACQUIRERS, ...extras]
  const cells = Object.fromEntries(
    VISION_SUMMARY_ROWS.filter((row) => row.key).map((row) => [row.key, emptyAmounts(columns)]),
  ) as Record<string, Record<string, number>>

  for (const receipt of rows) {
    const bucket = paymentBucket(receipt)
    for (const row of VISION_SUMMARY_ROWS) {
      if (!row.key) continue
      cells[row.key][bucket] += receipt.itemAmounts[row.key] ?? 0   // 마트에 없는 항목(선결제)은 0
    }
  }

  const totalsFor = (kind: 'free' | 'taxed') => Object.fromEntries(columns.map((column) => [
    column,
    VISION_SUMMARY_ROWS
      .filter((row) => row.kind === kind && row.key)
      .reduce((sum, row) => sum + cells[row.key!][column], 0),
  ]))
  const freeTotals = totalsFor('free')
  const taxedTotals = totalsFor('taxed')
  const columnTotals = Object.fromEntries(
    columns.map((column) => [column, freeTotals[column] + taxedTotals[column]]),
  )

  return { columns, cells, columnTotals, freeTotals, taxedTotals, count: rows.length }
}

export const summaryRowValues = (
  summary: VisionRevenueSummary,
  row: VisionSummaryRowDefinition,
): number[] => summary.columns.map((column) => row.key ? summary.cells[row.key][column] : 0)

export const summaryTotal = (values: number[]): number =>
  values.reduce((sum, value) => sum + value, 0)

export const summaryCardTotal = (summary: VisionRevenueSummary, values: number[]): number =>
  values.reduce((sum, value, index) => sum + (summary.columns[index] === '현금' ? 0 : value), 0)
