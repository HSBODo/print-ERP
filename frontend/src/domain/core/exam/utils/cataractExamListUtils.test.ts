import { describe, expect, it } from 'vitest'

import {
  CLASSIFICATION_ORDER,
  EXAM_COUNT_CLASSES,
  summarizeClassifications,
} from './cataractExamListUtils'

const rows = (spec: Record<string, number>) =>
  Object.entries(spec).flatMap(([classification, n]) =>
    Array.from({ length: n }, () => ({ classification })),
  )

describe('summarizeClassifications', () => {
  it('2026-07 실측 분포를 분류별로 그대로 센다', () => {
    const { breakdown, examCount, total } = summarizeClassifications(
      rows({ 백내장: 45, 중단: 11, '노안/FU': 40, 기타: 6 }),
    )

    expect(breakdown).toEqual([
      { name: '백내장', count: 45 },
      { name: '중단', count: 11 },
      { name: '노안/FU', count: 40 },
      { name: '기타', count: 6 },
    ])
    // 백내장검사수는 총건수가 아니라 백내장+중단 — 월간 레포트와 맞춰야 하는 값.
    expect(examCount).toBe(56)
    expect(total).toBe(102)
  })

  it('모르는 분류를 백내장으로 흡수하지 않는다', () => {
    // 종전 구현('아니면 백내장')에서는 백내장이 45가 아니라 48로 부풀었다.
    const { breakdown, examCount } = summarizeClassifications(
      rows({ 백내장: 45, 중단: 11, 검진: 3 }),
    )

    expect(breakdown).toContainEqual({ name: '백내장', count: 45 })
    expect(breakdown).toContainEqual({ name: '검진', count: 3 })
    expect(examCount).toBe(56)
  })

  it('빈 분류는 (미지정)으로 드러내고 검사수에 넣지 않는다', () => {
    const { breakdown, examCount } = summarizeClassifications(
      rows({ 백내장: 2, '': 1 }),
    )

    expect(breakdown).toContainEqual({ name: '(미지정)', count: 1 })
    expect(examCount).toBe(2)
  })

  it('없는 분류도 0건으로 자리를 지킨다', () => {
    const { breakdown } = summarizeClassifications(rows({ 백내장: 1 }))

    expect(breakdown.map((b) => b.name)).toEqual(CLASSIFICATION_ORDER)
    expect(breakdown).toContainEqual({ name: '노안/FU', count: 0 })
  })

  it('검사수 집계 대상은 백내장·중단 뿐이다', () => {
    expect(EXAM_COUNT_CLASSES).toEqual(['백내장', '중단'])
  })
})
