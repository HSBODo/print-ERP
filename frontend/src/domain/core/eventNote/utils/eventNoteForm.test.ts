import { describe, expect, it } from 'vitest'

import { eventNoteFormSchema, toRequest } from './eventNoteForm'

const base = {
  eventDate: '2026-09-05',
  summary: '추석 프로모션',
  description: '',
  isPeriod: false,
  startDate: '',
  endDate: '',
}

describe('eventNoteFormSchema', () => {
  it('기간형이 아니면 시작·종료일 없이 통과한다', () => {
    expect(eventNoteFormSchema.safeParse(base).success).toBe(true)
  })

  it('기간형은 시작일 ≤ 발생일 ≤ 종료일 이어야 한다', () => {
    const period = { ...base, isPeriod: true }
    expect(
      eventNoteFormSchema.safeParse({
        ...period,
        startDate: '2026-09-01',
        endDate: '2026-09-14',
      }).success,
    ).toBe(true)
    expect(
      eventNoteFormSchema.safeParse({
        ...period,
        startDate: '2026-09-06',
        endDate: '2026-09-14',
      }).success,
    ).toBe(false)
    expect(
      eventNoteFormSchema.safeParse({ ...period, startDate: '2026-09-01' })
        .success,
    ).toBe(false)
  })
})

describe('toRequest', () => {
  it('빈 설명은 null, 기간형이 아니면 시작·종료일을 null 로 보낸다', () => {
    expect(
      toRequest({
        ...base,
        description: '  ',
        startDate: '2026-09-01',
        endDate: '2026-09-14',
      }),
    ).toEqual({
      eventDate: '2026-09-05',
      summary: '추석 프로모션',
      description: null,
      startDate: null,
      endDate: null,
    })
  })
})
