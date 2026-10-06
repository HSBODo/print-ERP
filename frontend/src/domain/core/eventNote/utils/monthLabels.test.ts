import { describe, expect, it } from 'vitest'

import type { EventNote } from '../type/api'
import { toMonthLabels } from './monthLabels'

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

describe('toMonthLabels', () => {
  it('연도·월로 묶고 같은 달은 발생일 순으로 모은다', () => {
    expect(
      toMonthLabels([
        note('2026-09-17', '추석 휴진'),
        note('2026-09-01', '추석 프로모션'),
        note('2025-09-10', '작년 이벤트'),
      ]),
    ).toEqual([
      { year: 2025, monthIndex: 8, labels: ['작년 이벤트'] },
      { year: 2026, monthIndex: 8, labels: ['추석 프로모션', '추석 휴진'] },
    ])
  })
})
