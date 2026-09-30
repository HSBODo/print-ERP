import { describe, expect, it } from 'vitest'

import {
  changePoint,
  computeRate,
  formatRate,
  itemToData,
  toDataMap,
} from './consultationRateUtils'
import { type ConsultationRateItem } from '../../type/api'

const baseItem = (
  overrides: Partial<ConsultationRateItem> = {},
): ConsultationRateItem => ({
  year: 2026,
  month: 3,
  visionExamCount: 100,
  visionCounselCount: 80,
  visionSurgeryBooked: 60,
  visionActualSurgery: 55,
  visionSurgeryRate: 60,
  visionCounselRate: 80,
  cataractExamCount: 40,
  cataractSurgeryBooked: 20,
  cataractStoppedCount: 5,
  cataractSurgeryRate: 50,
  ...overrides,
})

describe('computeRate', () => {
  it('분모>0이면 소수 1자리 백분율', () => {
    expect(computeRate(50, 200)).toBe(25)
    expect(computeRate(1, 3)).toBe(33.3)
    expect(computeRate(2, 3)).toBe(66.7)
  })

  it('분모가 0 이하면 0', () => {
    expect(computeRate(5, 0)).toBe(0)
    expect(computeRate(0, 10)).toBe(0)
  })
})

describe('changePoint', () => {
  it('next - base 포인트 차이를 반환', () => {
    expect(changePoint(60, 57)).toBe(-3)
    expect(changePoint(57, 60)).toBe(3)
    expect(changePoint(50, 50)).toBe(0)
  })
})

describe('formatRate', () => {
  it('소수 1자리 % 문자열', () => {
    expect(formatRate(25)).toBe('25.0%')
    expect(formatRate(33.33)).toBe('33.3%')
  })
})

describe('itemToData', () => {
  it('전체 전환율은 (시력교정+백내장 예약)/(시력교정+백내장 검사)로 산정', () => {
    const data = itemToData(baseItem())
    // (60+20) / (100+40) = 80/140 = 57.14… → 57.1
    expect(data.overallConsultation).toBe(57.1)
  })

  it('세부 전환율·검사수는 그대로 매핑', () => {
    const data = itemToData(baseItem())
    expect(data.visionConsultation).toBe(80)
    expect(data.visionSurgery).toBe(60)
    expect(data.cataractSurgery).toBe(50)
    expect(data.visionExamCount).toBe(100)
    expect(data.cataractSurgeryBooked).toBe(20)
  })
})

describe('toDataMap', () => {
  it('연도별 12개월 배열로 분배하고 빈 달은 EMPTY(0)', () => {
    const map = toDataMap([
      baseItem({ month: 3 }),
      baseItem({ year: 2025, month: 1 }),
    ])

    expect(Object.keys(map).sort()).toEqual(['2025', '2026'])
    expect(map[2026]).toHaveLength(12)
    // month=3 → index 2 채워짐
    expect(map[2026][2].overallConsultation).toBe(57.1)
    // 값 없는 달은 0
    expect(map[2026][0].overallConsultation).toBe(0)
    // 다른 연도도 분리
    expect(map[2025][0].overallConsultation).toBe(57.1)
  })
})
