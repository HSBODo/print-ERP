import { EventNoteItem } from './EventNoteItem'
import type { EventNoteYearGroup } from './groupByYear'

/** 연도 제목(차트 선 색) + 그 연도 노트 목록 */
export function EventNoteYearSection({
  group,
  color,
}: {
  group: EventNoteYearGroup
  color?: string
}) {
  return (
    <section className="space-y-2">
      <h4 className="text-xs font-semibold" style={{ color }}>
        {group.year}
      </h4>
      <ul className="space-y-2">
        {group.notes.map((note) => (
          <EventNoteItem key={note.id} note={note} />
        ))}
      </ul>
    </section>
  )
}
