import { describe, expect, it } from 'vitest'
import type { ReservationChangeItem } from '../../../type/api'
import { buildViews, changeColumnCount, holidayLabel, parseChain, stepsAsOf, weekTag, type ChangeFilters } from './reservationChangeModel'

const item = (over: Partial<ReservationChangeItem>): ReservationChangeItem => ({
  reserveNum: '2607240001', registeredAt: '2026-07-24', registeredTime: '10:00', regSource: 'H',
  chartNo: '2230001', name: '심예린', branch: 'M', reserveState: 'Y',
  firstDate: '2026-07-24', finalDate: '2026-08-11', changeCount: 3,
  // 07-24 최초 → 08-06 변경① → 08-20 변경② → 08-11 변경③(기준일 08-05 이후)
  changeChain: '2026-07-20 10:00@2026-07-24|2026-07-25 09:00@2026-08-06|2026-08-01 14:00@2026-08-20|2026-08-06 11:00@2026-08-11',
  ...over,
})
const filters = (over: Partial<ChangeFilters> = {}): ChangeFilters => ({
  month: '', asOf: '', branch: '', state: '', minChanges: 1, sort: 'date', keyword: '', ...over,
})

describe('reservationChangeModel', () => {
  it('체인 문자열을 스텝으로 풀고 시각 미상 스텝도 받는다', () => {
    expect(parseChain('2026-06-24 11:42@2026-09-01|@2026-07-06')).toEqual([
      { changedAt: '2026-06-24 11:42', date: '2026-09-01' },
      { changedAt: '', date: '2026-07-06' },
    ])
    expect(parseChain('')).toEqual([])
  })

  it('기준일을 주면 그 시점까지의 스텝만 남고 횟수도 기준일까지로 준다 (기획서 §5 예시)', () => {
    const [view] = buildViews([item({})], filters({ asOf: '2026-08-05' }))
    expect(view.steps.map((s) => s.date)).toEqual(['2026-07-24', '2026-08-06', '2026-08-20'])
    expect(view.changes).toBe(2)
    expect(view.totalChanges).toBe(3)
    expect(view.asOfDate).toBe('2026-08-20') // 그날 화면에 보였을 예약일
    expect(view.row.finalDate).toBe('2026-08-11') // 최종은 현재값
  })

  it('기준일에 아직 등록 전이거나, 기준일 시점 예약일이 이미 지난 건은 빠진다', () => {
    expect(buildViews([item({})], filters({ asOf: '2026-07-01' }))).toHaveLength(0)
    // 기준일 09-01: 시점 예약일 08-11 < 09-01 → 지나간 예약
    expect(buildViews([item({})], filters({ asOf: '2026-09-01' }))).toHaveLength(0)
  })

  it('시각을 모르는 스텝은 기준일 판정에서 제외된다', () => {
    expect(stepsAsOf(parseChain('@2026-07-24|2026-07-25 09:00@2026-08-06'), '2026-08-01')).toEqual([
      { changedAt: '2026-07-25 09:00', date: '2026-08-06' },
    ])
  })

  it('구분·상태·월·검색·변경횟수 필터와 정렬이 동작한다', () => {
    const rows = [
      item({ reserveNum: 'a', registeredAt: '2026-07-24', name: '심예린' }),
      item({ reserveNum: 'b', registeredAt: '2026-06-02', branch: 'D', reserveState: 'C', name: '김철수', chartNo: '9', changeChain: '2026-06-02 09:00@2026-06-20|2026-06-03 09:00@2026-06-25' }),
    ]
    expect(buildViews(rows, filters({ branch: 'D' })).map((v) => v.row.reserveNum)).toEqual(['b'])
    expect(buildViews(rows, filters({ state: 'Y' })).map((v) => v.row.reserveNum)).toEqual(['a'])
    expect(buildViews(rows, filters({ month: '06' })).map((v) => v.row.reserveNum)).toEqual(['b'])
    expect(buildViews(rows, filters({ keyword: '철수' })).map((v) => v.row.reserveNum)).toEqual(['b'])
    expect(buildViews(rows, filters({ minChanges: 2 })).map((v) => v.row.reserveNum)).toEqual(['a'])
    expect(buildViews(rows, filters()).map((v) => v.row.reserveNum)).toEqual(['b', 'a']) // 등록일순
    expect(buildViews(rows, filters({ sort: 'chg' })).map((v) => v.row.reserveNum)).toEqual(['a', 'b'])
  })

  it('변경 칸 수는 결과 전체의 최대 변경 횟수(1~6)', () => {
    expect(changeColumnCount(buildViews([item({})], filters()))).toBe(3)
    expect(changeColumnCount([])).toBe(1)
  })

  it('ISO 주차 태그와 명절 라벨', () => {
    expect(weekTag('2022-01-01')).toBe('W52(21)')
    expect(weekTag('2026-08-13')).toBe('W33')
    expect(weekTag('')).toBe('')
    expect(holidayLabel('2026-02-12')).toBe('명절(구정)') // 2026-02-17 D-5
    expect(holidayLabel('2026-02-23')).toBe('') // D+6
    expect(holidayLabel('2025-10-06')).toBe('명절(추석)')
    expect(holidayLabel('2023-12-30')).toBe('신정')
  })
})
