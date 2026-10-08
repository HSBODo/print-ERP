import { describe, expect, it } from 'vitest'

import type { EventNote } from '../../type/api'
import { groupMonthNotesByYear } from './groupByYear'

const note = (eventDate: string, summary: string): EventNote => ({
  id: 0,
  eventDate,
  summary,
  description: null,
  startDate: null,
  endDate: null,
  createdBy: 'a',
  createdAt: '',
  updatedBy: 'a',
  updatedAt: '',
})

const summaries = (notes: EventNote[], monthIndex?: number) =>
  groupMonthNotesByYear(notes, monthIndex).map((g) => ({
    year: g.year,
    summaries: g.notes.map((n) => n.summary),
  }))

describe('groupMonthNotesByYear', () => {
  const notes = [
    note('2026-09-17', '추석 휴진'),
    note('2026-08-20', '다른 달'),
    note('2026-09-01', '추석 프로모션'),
    note('2025-09-10', '작년 이벤트'),
  ]

  it('그 달 노트만 연도 오름차순으로 묶고 같은 연도는 발생일 순', () => {
    expect(summaries(notes, 8)).toEqual([
      { year: 2025, summaries: ['작년 이벤트'] },
      { year: 2026, summaries: ['추석 프로모션', '추석 휴진'] },
    ])
  })

  it('달을 고르지 않았으면 빈 목록', () => {
    expect(summaries(notes)).toEqual([])
  })
})
