import { describe, expect, it } from 'vitest'
import {
  getCurrentPeriod,
  getDefaultPeriods,
  getDefaultYears,
  shiftPeriod,
} from '#shared/utils/stats'

describe('stats date helpers', () => {
  it('uses the current month as the base period and the previous month as compare', () => {
    const april = new Date(2026, 3, 11)

    expect(getCurrentPeriod(april)).toEqual({ year: 2026, month: 3 })
    expect(getDefaultPeriods(getCurrentPeriod(april))).toEqual([
      { year: 2026, month: 3 },
      { year: 2026, month: 2 },
    ])
    expect(getDefaultYears(2026)).toEqual([2026, 2025])
  })

  it('rolls back to the previous year when the base month is january', () => {
    expect(shiftPeriod({ year: 2026, month: 0 }, -1)).toEqual({
      year: 2025,
      month: 11,
    })
    expect(getDefaultPeriods({ year: 2026, month: 0 })).toEqual([
      { year: 2026, month: 0 },
      { year: 2025, month: 11 },
    ])
  })
})
