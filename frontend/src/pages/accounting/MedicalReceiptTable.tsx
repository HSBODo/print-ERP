import { useMemo, useState } from 'react'
import type { MedicalReceipt } from '@/api/accounting'
import { medicalNetRevenue } from './accountingModel'

type ColumnKey = keyof MedicalReceipt | '__no' | '__net' | '__card' | '__cash' | '__transfer'
type ColumnKind = 'text' | 'number' | 'center' | 'receiptType' | 'status' | 'closed' | 'no'
interface Column { key: ColumnKey; label: string; kind: ColumnKind }

const COLUMNS: Column[] = [
  { key: '__no', label: 'No', kind: 'no' }, { key: 'receiptDate', label: '수납일자', kind: 'text' },
  { key: 'patientName', label: '환자명', kind: 'text' }, { key: 'insuranceType', label: '보험유형', kind: 'text' },
  { key: 'chartNo', label: '차트번호', kind: 'text' }, { key: 'doctor', label: '진료의사', kind: 'text' },
  { key: 'receiptStaff', label: '수납담당', kind: 'text' }, { key: 'receiptType', label: '수납구분', kind: 'receiptType' },
  { key: 'revenueType', label: '매출구분', kind: 'text' }, { key: 'room', label: '진료실', kind: 'text' },
  { key: 'status', label: '상태', kind: 'status' }, { key: 'receiptTime', label: '수납시간', kind: 'center' },
  { key: 'serialNo', label: '일련번호', kind: 'center' }, { key: 'hundredCopay', label: '백대백본', kind: 'number' },
  { key: 'hundredUnpaid', label: '백대백미', kind: 'number' }, { key: 'salaryTotal', label: '급여총액', kind: 'number' },
  { key: 'claimAmount', label: '청구액', kind: 'number' }, { key: 'copay', label: '본인부담', kind: 'number' },
  { key: 'nonCovered', label: '비급여②', kind: 'number' }, { key: 'totalCopay', label: '총본인부담', kind: 'number' },
  { key: 'welfareSupport', label: '복지지원', kind: 'number' }, { key: 'disabledSupport', label: '장애인진', kind: 'number' },
  { key: 'supportAmount', label: '지원금', kind: 'number' }, { key: 'healthLivingExpense', label: '건생비', kind: 'number' },
  { key: 'actualPaid', label: '실수납액', kind: 'number' }, { key: '__net', label: '실수납합계', kind: 'number' },
  { key: 'outstanding', label: '미수금', kind: 'number' }, { key: 'refund', label: '환불액', kind: 'number' },
  { key: 'outstandingOccurred', label: '미수발생', kind: 'number' }, { key: 'outstandingRecovered', label: '미수회수', kind: 'number' },
  { key: 'discount', label: '할인액', kind: 'number' }, { key: 'discountReason', label: '할인사유', kind: 'text' },
  { key: '__card', label: '카드수납', kind: 'number' }, { key: '__cash', label: '현금수납', kind: 'number' },
  { key: '__transfer', label: '통장수납', kind: 'number' }, { key: 'outstandingCard', label: '미수카드', kind: 'number' },
  { key: 'outstandingCash', label: '미수현금', kind: 'number' }, { key: 'outstandingTransfer', label: '미수통장', kind: 'number' },
  { key: 'refundOccurred', label: '환불발생', kind: 'number' }, { key: 'cashReceipt', label: '현금영수증', kind: 'number' },
  { key: 'closed', label: '마감', kind: 'closed' },
]

const numericValue = (row: MedicalReceipt, key: ColumnKey): number => {
  if (key === '__net') return medicalNetRevenue(row)
  if (key === '__card') return row.card + row.outstandingCard
  if (key === '__cash') return row.cash + row.outstandingCash
  if (key === '__transfer') return row.transfer + row.outstandingTransfer
  const value = row[key as keyof MedicalReceipt]
  return typeof value === 'number' ? value : 0
}

const sortValue = (row: MedicalReceipt, key: ColumnKey): string | number | boolean => {
  if (key.toString().startsWith('__')) return numericValue(row, key)
  return row[key as keyof MedicalReceipt]
}

const NumberCell = ({ value, calculated = false }: { value: number; calculated?: boolean }) => (
  <td className={`whitespace-nowrap px-2.5 py-1 text-right tabular-nums ${value === 0 ? 'text-gray-300' : 'text-gray-800'} ${calculated ? 'bg-amber-50/40' : ''}`}>{value.toLocaleString('ko-KR')}</td>
)

const columnWidth = (kind: ColumnKind) => {
  if (kind === 'status') return 'min-w-14'
  if (kind === 'receiptType') return 'min-w-16'
  if (kind === 'closed') return 'min-w-12'
  return ''
}

function RowCell({ column, row, no }: { column: Column; row: MedicalReceipt; no: number }) {
  if (column.kind === 'no') return <td className="px-2.5 py-1 text-center">{no}</td>
  if (column.kind === 'number') return <NumberCell value={numericValue(row, column.key)} calculated={column.key.toString().startsWith('__')} />
  if (column.kind === 'status') return <td className="min-w-14 whitespace-nowrap px-2.5 py-1 text-center"><span className={`inline-flex whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${row.status === '정상' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'}`}>{row.status}</span></td>
  if (column.kind === 'receiptType') return <td className="min-w-16 whitespace-nowrap px-2.5 py-1 text-center"><span className={`inline-flex whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${row.receiptType === '입원' ? 'bg-violet-100 text-violet-700' : 'bg-sky-100 text-sky-700'}`}>{row.receiptType}</span></td>
  if (column.kind === 'closed') return <td className="min-w-12 whitespace-nowrap px-2.5 py-1 text-center">{row.closed ? '마감' : '-'}</td>
  const value = row[column.key as keyof MedicalReceipt]
  return <td className={`${column.kind === 'center' ? 'text-center' : ''} whitespace-nowrap px-2.5 py-1 text-gray-800`}>{String(value || '-')}</td>
}

function TotalRow({ rows, label, top, tone }: { rows: MedicalReceipt[]; label?: string; top: number; tone?: 'grand' | 'sub' }) {
  const background = tone === 'grand' ? 'bg-amber-100' : tone === 'sub' ? 'bg-blue-50 text-blue-800' : 'bg-amber-50 text-amber-800'
  return <tr>{COLUMNS.map((column, index) => {
    const base = `sticky z-[5] whitespace-nowrap border-b border-amber-200 px-2.5 py-1 font-bold ${background}`
    if (index === 0) return <td key={column.key} style={{ top }} className={`${base} text-center`}>합계</td>
    if (index === 1) return <td key={column.key} style={{ top }} className={base}>{rows.length.toLocaleString('ko-KR')}건</td>
    if (index === 2 && label) return <td key={column.key} style={{ top }} className={base}>{label}</td>
    if (column.kind === 'number') return <td key={column.key} style={{ top }} className={`${base} text-right tabular-nums`}>{rows.reduce((sum, row) => sum + numericValue(row, column.key), 0).toLocaleString('ko-KR')}</td>
    return <td key={column.key} style={{ top }} className={base} />
  })}</tr>
}

const requestedTotals = (rows: MedicalReceipt[]) => [
  { label: '전체', rows, tone: 'grand' as const },
  { label: '입원', rows: rows.filter((row) => row.revenueType === '입원'), tone: 'sub' as const },
  { label: '입원외', rows: rows.filter((row) => row.revenueType === '입원외'), tone: 'sub' as const },
  { label: '기타외래', rows: rows.filter((row) => row.revenueType === '기타외래'), tone: 'sub' as const },
]

export function MedicalReceiptTable({ rows, breakdown }: { rows: MedicalReceipt[]; breakdown: '전체' | '요청건' }) {
  const [sort, setSort] = useState<{ key: ColumnKey; direction: 'asc' | 'desc' } | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const sorted = useMemo(() => sort ? [...rows].sort((a, b) => String(sortValue(a, sort.key)).localeCompare(String(sortValue(b, sort.key)), 'ko', { numeric: true }) * (sort.direction === 'asc' ? 1 : -1)) : rows, [rows, sort])
  const pageMax = Math.max(1, Math.ceil(sorted.length / pageSize)); const safePage = Math.min(page, pageMax); const start = (safePage - 1) * pageSize
  const visible = sorted.slice(start, start + pageSize)
  const totals = breakdown === '요청건' ? requestedTotals(rows) : [{ label: '', rows, tone: undefined }]
  const toggleSort = (key: ColumnKey) => { if (key === '__no') return; setPage(1); setSort((prev) => prev?.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }) }

  return (
    <div className="flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="min-h-0 flex-1 overflow-auto border-b border-gray-200">
        <table className="min-w-full border-collapse text-[11px]"><thead><tr>{COLUMNS.map((column) => { const direction = sort?.key === column.key ? sort.direction : null; return <th key={column.key} onClick={() => toggleSort(column.key)} className={`sticky top-0 z-10 cursor-pointer whitespace-nowrap border-b border-gray-200 px-2.5 py-1.5 font-semibold text-gray-700 ${columnWidth(column.kind)} ${column.kind === 'number' ? 'bg-amber-50 text-right' : 'bg-gray-50 text-center'}`}><span className="inline-flex items-center gap-1"><span>{column.label}</span>{column.kind !== 'no' && <span className="flex flex-col gap-px"><i className={`h-0 w-0 border-x-[3px] border-b-[4px] border-x-transparent ${direction === 'asc' ? 'border-b-blue-600' : 'border-b-gray-300'}`} /><i className={`h-0 w-0 border-x-[3px] border-t-[4px] border-x-transparent ${direction === 'desc' ? 'border-t-blue-600' : 'border-t-gray-300'}`} /></span>}</span></th> })}</tr>{totals.map((item, index) => <TotalRow key={`${item.label}-${index}`} rows={item.rows} label={item.label} tone={item.tone} top={29 + index * 25} />)}</thead>
          <tbody>{visible.map((row, rowIndex) => <tr key={row.id} className="border-b border-gray-100 hover:bg-blue-50/50">{COLUMNS.map((column) => <RowCell key={column.key} column={column} row={row} no={start + rowIndex + 1} />)}</tr>)}{visible.length === 0 && <tr><td colSpan={COLUMNS.length} className="py-12 text-center text-sm text-gray-500">조회 결과가 없습니다.</td></tr>}</tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-2 py-1.5 text-xs"><span className="min-w-32 font-semibold">{rows.length.toLocaleString('ko-KR')}건 중 {rows.length ? start + 1 : 0}-{Math.min(start + pageSize, rows.length)}</span><div className="flex flex-1 justify-center gap-1"><button disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="h-7 rounded-md border px-2 disabled:opacity-40">이전</button>{Array.from({ length: pageMax }, (_, index) => index + 1).map((number) => <button key={number} onClick={() => setPage(number)} className={`h-7 min-w-7 rounded-md border px-2 ${safePage === number ? 'border-slate-900 bg-slate-900 text-white' : 'bg-white'}`}>{number}</button>)}<button disabled={safePage >= pageMax} onClick={() => setPage(safePage + 1)} className="h-7 rounded-md border px-2 disabled:opacity-40">다음</button></div><label className="ml-auto flex items-center gap-2 text-gray-500">행 수<select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }} className="h-7 rounded-md border border-gray-300 bg-white px-2 text-gray-800"><option>50</option><option>100</option><option>200</option><option>500</option></select></label></div>
    </div>
  )
}
