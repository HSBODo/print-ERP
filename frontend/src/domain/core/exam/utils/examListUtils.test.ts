import { describe, expect, it } from 'vitest'
import {
  CATARACT_REST_GROUP,
  GROUP_FILTERS,
  matchesExamGroup,
} from './examListUtils'

const row = (examGroup: string, cataractClass = '') => ({
  examGroup,
  cataractClass,
})

// 2026-07 실측 구성 — 백내장 예약 102행(백내장 45·중단 11·노안/FU 40·기타 6) + 시력교정/드림렌즈.
const july = [
  ...Array.from({ length: 45 }, () => row('백내장', '백내장')),
  ...Array.from({ length: 11 }, () => row('백내장', '중단')),
  ...Array.from({ length: 40 }, () => row('백내장', '노안/FU')),
  ...Array.from({ length: 6 }, () => row('백내장', '기타')),
  ...Array.from({ length: 3 }, () => row('시력교정')),
  ...Array.from({ length: 2 }, () => row('드림렌즈')),
]

const count = (selected: string) =>
  july.filter((r) => matchesExamGroup(r, selected)).length

describe('matchesExamGroup', () => {
  it('검사 필터에 노안/FU/기타 묶음이 있다', () => {
    expect(GROUP_FILTERS).toEqual([
      '전체',
      '시력교정',
      '드림렌즈',
      '백내장',
      '노안/FU/기타',
    ])
    expect(CATARACT_REST_GROUP).toBe('노안/FU/기타')
  })

  it('백내장 필터는 레포트 검사수와 같은 56건만 남긴다', () => {
    // 백내장(45) + 중단(11). 노안/FU·기타가 섞이면 레포트 백내장 검사수와 어긋난다.
    expect(count('백내장')).toBe(56)
  })

  it('노안/FU/기타 필터는 나머지 46건을 한 묶음으로 남긴다', () => {
    expect(count(CATARACT_REST_GROUP)).toBe(46)
  })

  it('두 필터는 겹치지 않고 합치면 백내장 예약 전체가 된다', () => {
    const both = july.filter(
      (r) =>
        matchesExamGroup(r, '백내장') &&
        matchesExamGroup(r, CATARACT_REST_GROUP),
    )
    expect(both).toHaveLength(0)
    expect(count('백내장') + count(CATARACT_REST_GROUP)).toBe(102)
  })

  it('시력교정·드림렌즈는 백내장 분류와 무관하게 걸린다', () => {
    expect(count('시력교정')).toBe(3)
    expect(count('드림렌즈')).toBe(2)
    expect(count('전체')).toBe(july.length)
  })

  it('분류를 모르는 백내장 행은 백내장이 아니라 나머지 묶음으로 간다', () => {
    // 백엔드가 새 분류를 내려도 레포트 검사수(백내장 필터)가 조용히 부풀지 않아야 한다.
    const unknown = [row('백내장', '검진')]
    expect(unknown.filter((r) => matchesExamGroup(r, '백내장'))).toHaveLength(0)
    expect(
      unknown.filter((r) => matchesExamGroup(r, CATARACT_REST_GROUP)),
    ).toHaveLength(1)
  })
})
