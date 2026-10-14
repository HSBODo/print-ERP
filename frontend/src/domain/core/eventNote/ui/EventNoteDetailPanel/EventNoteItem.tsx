import type { EventNote } from '../../type/api'
import { formatPeriod } from '../../utils/format'

/** 노트 한 건 — 요약 · 날짜(기간형이면 기간만, 발생일은 그 안에 있다) · 설명 */
export function EventNoteItem({ note }: { note: EventNote }) {
  const period = formatPeriod(note)
  return (
    <li className="rounded-md border border-border/70 bg-white p-3 break-keep">
      <p className="font-medium text-gray-900">{note.summary}</p>
      <p className="mt-0.5 text-xs text-gray-500">
        {period === '—' ? note.eventDate : period}
      </p>
      {note.description && (
        <p className="mt-2 whitespace-pre-line text-gray-700">
          {note.description}
        </p>
      )}
    </li>
  )
}
