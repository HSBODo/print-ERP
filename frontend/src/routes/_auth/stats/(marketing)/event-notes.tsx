import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

import {
  EVENT_NOTE_PAGE_SIZES,
  useEventNoteList,
} from '#domain/core/eventNote/hooks/useEventNoteList'
import type { EventNote } from '#domain/core/eventNote/type/api'
import { EventNoteDeleteDialog } from '#domain/core/eventNote/ui/EventNoteDeleteDialog'
import { EventNoteFilter } from '#domain/core/eventNote/ui/EventNoteFilter'
import { EventNoteFormDialog } from '#domain/core/eventNote/ui/EventNoteFormDialog'
import { EventNoteTable } from '#domain/core/eventNote/ui/EventNoteTable'
import { useAuthStore } from '#domain/support/session/store'
import { Card } from '#shared/ui/Card'
import { TablePagination } from '#shared/ui/TablePagination'

export const Route = createFileRoute('/_auth/stats/(marketing)/event-notes')({
  component: EventNotesPage,
  staticData: {
    page: {
      id: 'event-notes',
      label: '이벤트 노트',
      section: '마케팅',
      status: 'complete',
      access: { department: 'MARKETING' },
    },
  },
})

function EventNotesPage() {
  // DIRECTOR 는 열람만 (API 가 403) — 등록·수정·삭제 핸들러를 넘기지 않는다.
  const canEdit = useAuthStore((s) => s.user?.role !== 'DIRECTOR')
  const { filter, query, pagination, onDeleted } = useEventNoteList()
  const [editing, setEditing] = useState<{ note?: EventNote } | null>(null)
  const [deleting, setDeleting] = useState<EventNote | null>(null)

  return (
    <div className="flex flex-col gap-3 text-xs text-gray-800">
      <EventNoteFilter
        filter={filter}
        query={query}
        onCreate={canEdit ? () => setEditing({}) : undefined}
      />
      <Card className="overflow-hidden p-0">
        <EventNoteTable
          query={query}
          rangeStart={pagination.rangeStart}
          onEdit={canEdit ? (note) => setEditing({ note }) : undefined}
          onDelete={canEdit ? setDeleting : undefined}
        />
        <TablePagination
          pagination={pagination}
          pageSizeOptions={EVENT_NOTE_PAGE_SIZES}
          className="border-t border-gray-100 bg-gray-50/50 px-3 py-2"
        />
      </Card>
      {editing && (
        <EventNoteFormDialog
          note={editing.note}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <EventNoteDeleteDialog
          note={deleting}
          onDeleted={onDeleted}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
