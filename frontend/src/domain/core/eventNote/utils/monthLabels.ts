import type { EventNote } from '../type/api'

/** 연도·월 단위 차트에 붙일 레이블 — 같은 달 노트는 발생일 순으로 모은다. */
export interface EventNoteMonthLabel {
  year: number
  /** 0 = 1월 */
  monthIndex: number
  labels: string[]
}

export function toMonthLabels(notes: EventNote[]): EventNoteMonthLabel[] {
  const sorted = [...notes].sort((a, b) =>
    a.eventDate.localeCompare(b.eventDate),
  )
  const byMonth = new Map<string, EventNoteMonthLabel>()
  for (const { eventDate, summary } of sorted) {
    const key = eventDate.slice(0, 7)
    const found = byMonth.get(key)
    if (found) {
      found.labels.push(summary)
    } else {
      byMonth.set(key, {
        year: Number(eventDate.slice(0, 4)),
        monthIndex: Number(eventDate.slice(5, 7)) - 1,
        labels: [summary],
      })
    }
  }
  return [...byMonth.values()]
}
