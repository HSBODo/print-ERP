import type { EventNote } from '../../type/api'
import { parseYearMonth } from '../../utils/monthLabels'

export interface EventNoteYearGroup {
  year: number
  notes: EventNote[]
}

/** 그 달(0 = 1월) 노트를 연도별로 — 연도 오름차순, 같은 연도는 발생일 순(툴팁과 같은 순서) */
export function groupMonthNotesByYear(
  notes: EventNote[],
  monthIndex: number | undefined,
): EventNoteYearGroup[] {
  const groups: EventNoteYearGroup[] = []
  const byDate = notes.toSorted((a, b) =>
    a.eventDate.localeCompare(b.eventDate),
  )

  for (const note of byDate) {
    const { year, monthIndex: noteMonth } = parseYearMonth(note.eventDate)
    if (noteMonth !== monthIndex) continue
    const sameYear = groups.find((g) => g.year === year)
    if (sameYear) sameYear.notes.push(note)
    else groups.push({ year, notes: [note] })
  }
  return groups
}
