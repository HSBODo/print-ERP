import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { useAuthStore } from '#domain/support/session/store'
import { useFilter } from '#shared/hooks/useFilter'
import type { PaginationState } from '#shared/hooks/usePagination'
import { Button } from '#shared/ui/Button'
import { Card } from '#shared/ui/Card'
import { Filter } from '#shared/ui/Filter'
import { TablePagination } from '#shared/ui/TablePagination'
import { type DateRange, thisMonthRange } from '#shared/utils/date'

import { useDeleteEventNote } from '../../hooks/useDeleteEventNote'
import { useEventNotes } from '../../hooks/useEventNotes'
import type { EventNote } from '../../type/api'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { EventNoteFormDialog } from './EventNoteFormDialog'

/** 서버 최대 100행. */
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const
const DEFAULT_PAGE_SIZE = 20
const COLUMN_COUNT = 8

type Period = 'all' | 'range'
const PERIOD_OPTIONS = [
  { value: 'all' as const, label: '전체 기간' },
  { value: 'range' as const, label: '기간 지정' },
]

const defaultFilter = (): { period: Period; range: DateRange } => ({
  period: 'all',
  range: thisMonthRange(),
})

/** 2026-08-28T10:30:00 → 2026-08-28 10:30 */
const formatDateTime = (value: string) => value.slice(0, 16).replace('T', ' ')

const formatPeriod = ({ startDate, endDate }: EventNote) =>
  startDate || endDate ? `${startDate ?? ''} ~ ${endDate ?? ''}` : '-'

/**
 * 이벤트 노트 관리 — 차트에 겹쳐 볼 사건(프로모션·휴진 등)을 등록·수정·삭제한다.
 * 목록은 서버 페이징(발생일 내림차순). 행을 누르면 수정, 마지막 열은 삭제.
 * DIRECTOR 는 열람만 (API 가 403) — 등록·수정·삭제를 숨긴다.
 */
export function EventNotePage() {
  const canEdit = useAuthStore((s) => s.user?.role !== 'DIRECTOR')

  const [page, setPage] = useState(0)
  const [size, setSize] = useState(DEFAULT_PAGE_SIZE)
  const filter = useFilter({
    defaults: defaultFilter,
    onSearch: () => setPage(0),
    onReset: () => {
      setPage(0)
      setSize(DEFAULT_PAGE_SIZE)
    },
  })
  const { period, range } = filter.applied
  const notes = useEventNotes({
    ...(period === 'range' ? range : {}),
    page,
    size,
  })
  const deleteMutation = useDeleteEventNote()

  const [editor, setEditor] = useState<{ note?: EventNote } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EventNote | null>(null)

  const rows = notes.data?.content ?? []
  const total = notes.data?.totalElements ?? 0
  const pageMax = Math.max(1, notes.data?.totalPages ?? 1)
  const pagination: PaginationState = {
    page: page + 1,
    pageMax,
    pageSize: size,
    total,
    rangeStart: total === 0 ? 0 : page * size + 1,
    rangeEnd: page * size + rows.length,
    setPage: (next) => setPage(Math.min(Math.max(1, next), pageMax) - 1),
    setPageSize: (next) => {
      setSize(next)
      setPage(0)
    },
    resetPage: () => setPage(0),
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toast.success('이벤트 노트를 삭제했습니다')
      setDeleteTarget(null)
      // 마지막 페이지의 마지막 행을 지우면 빈 페이지가 남으니 한 칸 앞으로.
      if (rows.length === 1 && page > 0) setPage(page - 1)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '삭제 실패')
    }
  }

  return (
    <div className="flex flex-col gap-3 text-xs text-gray-800">
      <Filter.Root
        filter={filter}
        isFetching={notes.isFetching}
        refetch={notes.refetch}
      >
        <Filter.Bar>
          <Filter.Segment
            {...filter.field('period')}
            options={PERIOD_OPTIONS}
            ariaLabel="기간"
          />
          {filter.draft.period === 'range' && (
            <Filter.DateRange {...filter.field('range')} />
          )}
          <Filter.Count value={total} />
          <Filter.Actions>
            {canEdit && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => setEditor({})}
              >
                <Plus className="h-3.5 w-3.5" />
                등록
              </Button>
            )}
          </Filter.Actions>
        </Filter.Bar>
      </Filter.Root>

      <Card className="overflow-hidden p-0">
        <div className="max-h-[calc(100vh-14rem)] min-h-[24rem] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]">
              <tr className="text-left text-xs text-gray-500">
                <th className="w-12 px-4 py-3 text-right font-medium">#</th>
                <th className="w-28 px-4 py-3 font-medium">발생일</th>
                <th className="px-4 py-3 font-medium">요약</th>
                <th className="px-4 py-3 font-medium">설명</th>
                <th className="w-52 px-4 py-3 font-medium">기간</th>
                <th className="w-28 px-4 py-3 font-medium">작성자</th>
                <th className="w-36 px-4 py-3 font-medium">수정일시</th>
                <th className="w-16 px-4 py-3 text-right font-medium">삭제</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {notes.isLoading && (
                <tr>
                  <td
                    colSpan={COLUMN_COUNT}
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    불러오는 중…
                  </td>
                </tr>
              )}
              {notes.isError && (
                <tr>
                  <td
                    colSpan={COLUMN_COUNT}
                    className="px-4 py-12 text-center text-red-500"
                  >
                    {notes.error instanceof Error
                      ? notes.error.message
                      : '조회 실패'}
                  </td>
                </tr>
              )}
              {rows.map((note, i) => (
                <tr
                  key={note.id}
                  onClick={canEdit ? () => setEditor({ note }) : undefined}
                  className={
                    canEdit
                      ? 'cursor-pointer transition-colors hover:bg-gray-50'
                      : undefined
                  }
                >
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-400 tabular-nums">
                    {pagination.rangeStart + i}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-gray-900">
                    {note.eventDate}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">
                    {note.summary}
                  </td>
                  <td
                    className="max-w-[24rem] truncate px-4 py-2.5 text-gray-600"
                    title={note.description ?? undefined}
                  >
                    {note.description ?? '-'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-gray-600">
                    {formatPeriod(note)}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    {note.updatedBy}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-gray-600">
                    {formatDateTime(note.updatedAt)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTarget(note)
                        }}
                        className="rounded p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700"
                        aria-label={`${note.summary} 삭제`}
                        title="삭제"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {notes.isSuccess && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={COLUMN_COUNT}
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    등록된 이벤트 노트가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          pagination={pagination}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          className="border-t border-gray-100 bg-gray-50/50 px-3 py-2"
        />
      </Card>

      {editor && (
        <EventNoteFormDialog
          note={editor.note}
          onClose={() => setEditor(null)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          note={deleteTarget}
          isSubmitting={deleteMutation.isPending}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
