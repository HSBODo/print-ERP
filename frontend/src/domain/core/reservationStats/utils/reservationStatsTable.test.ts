import { describe, expect, it } from 'vitest'

import { columnSpan, splitColumnGroups } from './reservationStatsTable'

describe('reservation stats table helpers', () => {
  it('splits columns by ordered group spans', () => {
    const groups = splitColumnGroups(['a', 'b', 'c', 'd', 'e'], [
      { key: 'left', span: 2 },
      { key: 'right', span: 3 },
    ] as const)

    expect(groups.left).toEqual(['a', 'b'])
    expect(groups.right).toEqual(['c', 'd', 'e'])
  })

  it('guards mismatched group spans', () => {
    expect(() =>
      splitColumnGroups(['a', 'b'], [
        { key: 'left', span: 1 },
        { key: 'right', span: 2 },
      ] as const),
    ).toThrow('Column group spans (3) do not match column count (2).')
  })

  it('sums multiple column group lengths', () => {
    expect(columnSpan(['a'], ['b', 'c'], [])).toBe(3)
  })
})
