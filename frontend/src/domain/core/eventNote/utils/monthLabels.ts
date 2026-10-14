import type { EventNote } from '../type/api'

/** 연도·월 단위 차트에 붙일 레이블 — 같은 달 노트는 발생일 순으로 모은다. */
export interface EventNoteMonthLabel {
  year: number
  /** 0 = 1월 */
  monthIndex: number
  labels: string[]
}

/** '2026-09-17' → { year: 2026, monthIndex: 8 } */
export function parseYearMonth(date: string) {
  const [year, month] = date.split('-').map(Number)
  return { year, monthIndex: month - 1 }
}

export function toMonthLabels(notes: EventNote[]): EventNoteMonthLabel[] {
  const result: EventNoteMonthLabel[] = []
  const byDate = notes.toSorted((a, b) =>
    a.eventDate.localeCompare(b.eventDate),
  )

  for (const note of byDate) {
    const { year, monthIndex } = parseYearMonth(note.eventDate)
    const sameMonth = result.find(
      (item) => item.year === year && item.monthIndex === monthIndex,
    )
    if (sameMonth) sameMonth.labels.push(note.summary)
    else result.push({ year, monthIndex, labels: [note.summary] })
  }
  return result
}
