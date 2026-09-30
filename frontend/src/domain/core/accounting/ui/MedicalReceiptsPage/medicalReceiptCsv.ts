import type { MedicalReceipt } from '../../type/accounting'
import { medicalNetRevenue } from '../../utils/accountingModel'

const CSV_COLUMNS = [
  ['No', (_row: MedicalReceipt, index: number) => index + 1],
  ['수납일자', (row: MedicalReceipt) => row.receiptDate],
  ['환자명', (row: MedicalReceipt) => row.patientName],
  ['보험유형', (row: MedicalReceipt) => row.insuranceType],
  ['차트번호', (row: MedicalReceipt) => row.chartNo],
  ['진료의사', (row: MedicalReceipt) => row.doctor],
  ['수납담당', (row: MedicalReceipt) => row.receiptStaff],
  ['수납구분', (row: MedicalReceipt) => row.receiptType],
  ['매출구분', (row: MedicalReceipt) => row.revenueType],
  ['진료실', (row: MedicalReceipt) => row.room],
  ['상태', (row: MedicalReceipt) => row.status],
  ['수납시간', (row: MedicalReceipt) => row.receiptTime],
  ['일련번호', (row: MedicalReceipt) => row.serialNo],
  ['백대백본', (row: MedicalReceipt) => row.hundredCopay],
  ['백대백미', (row: MedicalReceipt) => row.hundredUnpaid],
  ['급여총액', (row: MedicalReceipt) => row.salaryTotal],
  ['청구액', (row: MedicalReceipt) => row.claimAmount],
  ['본인부담', (row: MedicalReceipt) => row.copay],
  ['비급여②', (row: MedicalReceipt) => row.nonCovered],
  ['총본인부담', (row: MedicalReceipt) => row.totalCopay],
  ['복지지원', (row: MedicalReceipt) => row.welfareSupport],
  ['장애인진', (row: MedicalReceipt) => row.disabledSupport],
  ['지원금', (row: MedicalReceipt) => row.supportAmount],
  ['건생비', (row: MedicalReceipt) => row.healthLivingExpense],
  ['실수납액', (row: MedicalReceipt) => row.actualPaid],
  ['실수납합계', (row: MedicalReceipt) => medicalNetRevenue(row)],
  ['미수금', (row: MedicalReceipt) => row.outstanding],
  ['환불액', (row: MedicalReceipt) => row.refund],
  ['미수발생', (row: MedicalReceipt) => row.outstandingOccurred],
  ['미수회수', (row: MedicalReceipt) => row.outstandingRecovered],
  ['할인액', (row: MedicalReceipt) => row.discount],
  ['할인사유', (row: MedicalReceipt) => row.discountReason],
  ['카드수납', (row: MedicalReceipt) => row.card + row.outstandingCard],
  ['현금수납', (row: MedicalReceipt) => row.cash + row.outstandingCash],
  ['통장수납', (row: MedicalReceipt) => row.transfer + row.outstandingTransfer],
  ['미수카드', (row: MedicalReceipt) => row.outstandingCard],
  ['미수현금', (row: MedicalReceipt) => row.outstandingCash],
  ['미수통장', (row: MedicalReceipt) => row.outstandingTransfer],
  ['환불발생', (row: MedicalReceipt) => row.refundOccurred],
  ['현금영수증', (row: MedicalReceipt) => row.cashReceipt],
  ['마감', (row: MedicalReceipt) => (row.closed ? '마감' : '')],
] as const

const escapeCsv = (value: unknown) => `"${String(value).replace(/"/g, '""')}"`

export function downloadMedicalCsv(rows: MedicalReceipt[]) {
  const lines = [CSV_COLUMNS.map(([label]) => escapeCsv(label)).join(',')]
  rows.forEach((row, index) => {
    lines.push(
      CSV_COLUMNS.map(([, value]) => escapeCsv(value(row, index))).join(','),
    )
  })
  const blob = new Blob([`\ufeff${lines.join('\r\n')}`], {
    type: 'text/csv;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = '진료수납내역.csv'
  link.click()
  URL.revokeObjectURL(url)
}
