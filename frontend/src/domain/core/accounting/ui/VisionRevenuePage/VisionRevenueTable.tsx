import { useMemo, useState } from 'react'
import { usePagination } from '#shared/hooks/usePagination'
import { TablePagination } from '#shared/ui/TablePagination'
import type { VisionReceipt } from '../../type/accounting'
import type { VisionExtraFilters } from '../VisionRevenueControls'
import { ACCOUNTING_PAGE_SIZE_OPTIONS } from '../../utils/accountingModel'
import {
  VISION_COLUMNS,
  visionCellValue,
  visionNumericValue,
  type VisionColumn,
  type VisionColumnKey,
} from './visionRevenueColumns'

function RowCell({
  column,
  row,
  no,
}: {
  column: VisionColumn
  row: VisionReceipt
  no: number
}) {
  if (column.kind === 'no')
    return <td className="px-2.5 py-1 text-center">{no}</td>
  if (column.kind === 'number' || column.kind === 'derived') {
    const value = visionNumericValue(row, column.key)
    return (
      <td
        className={`whitespace-nowrap px-2.5 py-1 text-right tabular-nums ${column.kind === 'derived' ? 'bg-amber-50/40' : ''} ${value === 0 ? 'text-gray-300' : value < 0 ? 'text-red-600' : 'text-gray-800'}`}
      >
        {value.toLocaleString('ko-KR')}
      </td>
    )
  }
  if (column.kind === 'status')
    return (
      <td className="min-w-20 whitespace-nowrap px-2.5 py-1 text-center">
        <span
          className={`inline-flex whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${row.status === '결제처리' ? 'bg-gray-100 text-gray-600' : 'bg-red-100 text-red-700'}`}
        >
          {row.status}
        </span>
      </td>
    )
  const value = visionCellValue(row, column.key)
  return (
    <td
      className={`${column.kind === 'center' ? 'text-center' : ''} whitespace-nowrap px-2.5 py-1 text-gray-800`}
    >
      {value === '' ? '-' : value}
    </td>
  )
}

function TotalRow({
  rows,
  label,
  top,
  tone,
}: {
  rows: VisionReceipt[]
  label?: string
  top: number
  tone?: 'grand' | 'sub'
}) {
  const background =
    tone === 'grand'
      ? 'bg-amber-100'
      : tone === 'sub'
        ? 'bg-blue-50 text-blue-800'
        : 'bg-amber-50 text-amber-800'
  return (
    <tr>
      {VISION_COLUMNS.map((column, index) => {
        const base = `sticky z-[5] whitespace-nowrap border-b border-amber-200 px-2.5 py-1 font-bold ${background}`
        if (index === 0)
          return (
            <td
              key={column.key}
              style={{ top }}
              className={`${base} text-center`}
            >
              합계
            </td>
          )
        if (index === 1)
          return (
            <td key={column.key} style={{ top }} className={base}>
              {rows.length.toLocaleString('ko-KR')}건
            </td>
          )
        if (column.key === 'patientName' && label)
          return (
            <td key={column.key} style={{ top }} className={base}>
              {label}
            </td>
          )
        if (column.kind === 'number' || column.kind === 'derived')
          return (
            <td
              key={column.key}
              style={{ top }}
              className={`${base} text-right tabular-nums`}
            >
              {rows
                .reduce(
                  (sum, row) => sum + visionNumericValue(row, column.key),
                  0,
                )
                .toLocaleString('ko-KR')}
            </td>
          )
        return <td key={column.key} style={{ top }} className={base} />
      })}
    </tr>
  )
}

const paymentGroup = (row: VisionReceipt) =>
  row.paymentMethod === '카드' ? '카드' : '현금'

const subtotalGroups = (
  rows: VisionReceipt[],
  breakdown: VisionExtraFilters['breakdown'],
) => {
  if (breakdown === '결제수단')
    return ['카드', '현금'].map((label) => ({
      label,
      rows: rows.filter((row) => paymentGroup(row) === label),
    }))
  const key = breakdown === '진료구분' ? 'category' : 'acquirer'
  const grouped = new Map<string, VisionReceipt[]>()
  rows.forEach((row) => {
    const label = row[key] || '(없음)'
    grouped.set(label, [...(grouped.get(label) ?? []), row])
  })
  return [...grouped.entries()]
    .map(([label, groupedRows]) => ({ label, rows: groupedRows }))
    .sort(
      (a, b) =>
        b.rows.reduce((sum, row) => sum + row.amount, 0) -
        a.rows.reduce((sum, row) => sum + row.amount, 0),
    )
}

export function VisionRevenueTable({
  rows,
  breakdown,
}: {
  rows: VisionReceipt[]
  breakdown: VisionExtraFilters['breakdown']
}) {
  const [sort, setSort] = useState<{
    key: VisionColumnKey
    direction: 'asc' | 'desc'
  } | null>(null)
  const sorted = useMemo(
    () =>
      sort
        ? [...rows].sort(
            (a, b) =>
              String(visionCellValue(a, sort.key)).localeCompare(
                String(visionCellValue(b, sort.key)),
                'ko',
                { numeric: true },
              ) * (sort.direction === 'asc' ? 1 : -1),
          )
        : rows,
    [rows, sort],
  )
  const pagination = usePagination(sorted)
  const totals =
    breakdown === '전체'
      ? [{ label: '', rows, tone: undefined }]
      : [
          { label: '전체', rows, tone: 'grand' as const },
          ...subtotalGroups(rows, breakdown).map((group) => ({
            ...group,
            tone: 'sub' as const,
          })),
        ]
  const toggleSort = (key: VisionColumnKey) => {
    if (key === '__no') return
    pagination.resetPage()
    setSort((previous) =>
      previous?.key === key
        ? { key, direction: previous.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    )
  }

  return (
    <div className="flex min-h-[420px] min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="min-h-0 flex-1 overflow-auto border-b border-gray-200">
        <table className="min-w-full border-collapse text-[11px]">
          <thead>
            <tr>
              {VISION_COLUMNS.map((column) => {
                const direction =
                  sort?.key === column.key ? sort.direction : null
                return (
                  <th
                    key={column.key}
                    onClick={() => toggleSort(column.key)}
                    className={`sticky top-0 z-10 cursor-pointer whitespace-nowrap border-b border-gray-200 px-2.5 py-1.5 font-semibold text-gray-700 ${column.kind === 'status' ? 'min-w-20' : ''} ${column.kind === 'number' || column.kind === 'derived' ? `${column.kind === 'derived' ? 'bg-amber-50' : 'bg-gray-50'} text-right` : 'bg-gray-50 text-center'}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <span>{column.label}</span>
                      {column.kind !== 'no' && (
                        <span className="flex flex-col gap-px">
                          <i
                            className={`h-0 w-0 border-x-[3px] border-b-[4px] border-x-transparent ${direction === 'asc' ? 'border-b-blue-600' : 'border-b-gray-300'}`}
                          />
                          <i
                            className={`h-0 w-0 border-x-[3px] border-t-[4px] border-x-transparent ${direction === 'desc' ? 'border-t-blue-600' : 'border-t-gray-300'}`}
                          />
                        </span>
                      )}
                    </span>
                  </th>
                )
              })}
            </tr>
            {totals.map((item, index) => (
              <TotalRow
                key={`${item.label}-${index}`}
                rows={item.rows}
                label={item.label}
                tone={item.tone}
                top={29 + index * 25}
              />
            ))}
          </thead>
          <tbody>
            {pagination.pageRows.map((row, rowIndex) => (
              <tr
                key={row.id}
                className="border-b border-gray-100 hover:bg-blue-50/50"
              >
                {VISION_COLUMNS.map((column) => (
                  <RowCell
                    key={column.key}
                    column={column}
                    row={row}
                    no={pagination.rangeStart + rowIndex}
                  />
                ))}
              </tr>
            ))}
            {pagination.pageRows.length === 0 && (
              <tr>
                <td
                  colSpan={VISION_COLUMNS.length}
                  className="py-12 text-center text-sm text-gray-500"
                >
                  조회 결과가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <TablePagination
        pagination={pagination}
        pageSizeOptions={ACCOUNTING_PAGE_SIZE_OPTIONS}
      />
    </div>
  )
}
