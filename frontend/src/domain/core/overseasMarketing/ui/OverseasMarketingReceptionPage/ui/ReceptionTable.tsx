import {
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  Pencil,
  Trash2,
} from 'lucide-react'

import type { Pagination } from '#shared/hooks/usePagination'
import { Card, CardContent } from '#shared/ui/Card'
import { TablePagination } from '#shared/ui/TablePagination'

import type { OverseasMarketingReception } from '../../../type/api'
import {
  alignClass,
  COLUMNS,
  dash,
  type SortKey,
  STATUS_STYLE,
  type TableColumn,
} from '../utils/receptionColumns'

function Badge({ text, className }: { text: string; className: string }) {
  return text ? (
    <span
      className={`inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${className}`}
    >
      {text}
    </span>
  ) : (
    <span className="text-gray-300">—</span>
  )
}

interface Props {
  pagination: Pagination<OverseasMarketingReception>
  sort: { key: SortKey; dir: 'asc' | 'desc' } | null
  onToggleSort: (key: SortKey) => void
  onEdit: (row: OverseasMarketingReception) => void
  onDelete: (row: OverseasMarketingReception) => void
  onOpenMatch: (row: OverseasMarketingReception) => void
  deletePending: boolean
  fetching: boolean
  isError: boolean
}

export function ReceptionTable(props: Props) {
  const {
    pagination,
    sort,
    onToggleSort,
    onEdit,
    onDelete,
    onOpenMatch,
    deletePending,
    fetching,
    isError,
  } = props

  const renderValue = (
    row: OverseasMarketingReception,
    column: TableColumn,
  ) => {
    if (column.key === 'status')
      return (
        <Badge
          text={row.status}
          className={STATUS_STYLE[row.status] ?? 'bg-gray-100 text-gray-600'}
        />
      )
    if (column.key === 'customerNo') {
      // 셀 클릭으로 매칭 확인 팝업을 연다 — 확인필요는 후보 확정, 접수는 수동 입력, 매칭은 변경.
      if (row.matchStatus === 'matched') {
        return (
          <button
            type="button"
            onClick={() => onOpenMatch(row)}
            className="tabular-nums text-blue-700 underline-offset-2 hover:underline"
            title={`매칭: ${row.matchedBy || 'CRM_Sync'} — 클릭하여 변경`}
          >
            {row.customerNo}
          </button>
        )
      }
      if (row.matchStatus === 'review') {
        return (
          <button
            type="button"
            onClick={() => onOpenMatch(row)}
            className="inline-flex rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-200"
            title={row.candidateReason}
          >
            확인필요
          </button>
        )
      }
      return (
        <button
          type="button"
          onClick={() => onOpenMatch(row)}
          className="text-gray-400 underline-offset-2 hover:text-blue-600 hover:underline"
          title="클릭하여 CRM 고객번호 직접 매칭"
        >
          미매칭
        </button>
      )
    }
    const value = column.key ? String(row[column.key] ?? '') : ''
    return (
      <span className="block truncate" title={value}>
        {dash(value)}
      </span>
    )
  }

  return (
    <Card className="min-h-0 flex-1 border-border/70 py-0 shadow-sm">
      <CardContent className="flex h-full min-h-0 flex-col px-0">
        <div className="min-h-0 flex-1 overflow-auto rounded-t-lg border-b border-border/60">
          <table className="min-w-max table-fixed border-collapse text-[12px]">
            <thead>
              <tr className="bg-gray-50 text-gray-700">
                {COLUMNS.map((column) => {
                  const active = column.key !== null && sort?.key === column.key
                  return (
                    <th
                      key={column.label}
                      className={`sticky top-0 z-10 ${column.width} whitespace-nowrap border-b border-border/60 bg-gray-50 px-2 py-2 text-center font-semibold`}
                    >
                      {column.key ? (
                        <button
                          type="button"
                          onClick={() => onToggleSort(column.key as SortKey)}
                          className={`inline-flex items-center gap-1 hover:text-blue-700 ${active ? 'text-blue-700' : ''}`}
                        >
                          {column.label}
                          {active ? (
                            sort?.dir === 'asc' ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )
                          ) : (
                            <ChevronsUpDown className="h-3 w-3 text-gray-300" />
                          )}
                        </button>
                      ) : (
                        column.label
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {fetching && (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="py-14 text-center text-sm text-muted-foreground"
                  >
                    불러오는 중…
                  </td>
                </tr>
              )}
              {isError && !fetching && (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="py-14 text-center text-sm text-red-500"
                  >
                    접수 데이터를 불러오지 못했습니다.
                  </td>
                </tr>
              )}
              {!fetching &&
                !isError &&
                pagination.pageRows.map((row, index) => (
                  <tr
                    key={row.rowId}
                    className="border-b border-border/40 hover:bg-blue-50/40"
                  >
                    {COLUMNS.map((column, columnIndex) => (
                      <td
                        key={column.label}
                        className={`${column.width} truncate whitespace-nowrap px-2 py-1 ${alignClass(column.align)}`}
                      >
                        {columnIndex === 0 ? (
                          (pagination.rangeStart + index).toLocaleString()
                        ) : column.label === '관리' ? (
                          <span className="inline-flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => onEdit(row)}
                              className="rounded p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                              title="수정"
                              aria-label={`${row.name} 수정`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(row)}
                              disabled={row.locked || deletePending}
                              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                              title={
                                row.locked
                                  ? '동기화를 거친 행은 삭제할 수 없습니다'
                                  : '삭제'
                              }
                              aria-label={`${row.name} 삭제`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        ) : (
                          renderValue(row, column)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              {!fetching && !isError && !pagination.pageRows.length && (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="py-14 text-center text-sm text-muted-foreground"
                  >
                    조회 결과가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination pagination={pagination} />
      </CardContent>
    </Card>
  )
}
