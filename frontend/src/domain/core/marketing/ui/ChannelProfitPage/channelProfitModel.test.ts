import { describe, expect, it } from 'vitest'
import type { ReservationChannelFunnelItem } from '../../type/api'
import type { ChannelLensCost } from '../../type/api'
import {
  buildChannelRows,
  cohortMaturity,
  COHORT_DAYS,
} from './channelProfitModel'

/** 퍼널 한 행 — 이 테스트가 보는 필드만 채우고 나머지는 0. */
const funnelRow = (
  o: Partial<ReservationChannelFunnelItem>,
): ReservationChannelFunnelItem =>
  ({
    channel: '네이버',
    reserved: 0,
    notCancel: 0,
    visited: 0,
    examined: 0,
    notStop: 0,
    surgery: 0,
    surgeryDone: 0,
    reop: 0,
    surgeryAmount: 0,
    reservedPersons: 0,
    notCancelPersons: 0,
    visitedPersons: 0,
    examinedPersons: 0,
    notStopPersons: 0,
    surgeryPersons: 0,
    surgeryDonePersons: 0,
    reopPersons: 0,
    surgeryPaidPersons: 0,
    totalReservedPersons: 0,
    totalNotCancelPersons: 0,
    totalVisitedPersons: 0,
    totalExaminedPersons: 0,
    totalNotStopPersons: 0,
    totalSurgeryPersons: 0,
    totalSurgeryDonePersons: 0,
    totalReopPersons: 0,
    totalSurgeryAmount: 0,
    totalSurgeryPaidPersons: 0,
    ...o,
  }) as ReservationChannelFunnelItem

const lensRow = (o: Partial<ChannelLensCost>): ChannelLensCost => ({
  channel: '네이버',
  lensEyes: 0,
  lensEyesPriced: 0,
  lensEyesUnpriced: 0,
  lensCostManwon: 0,
  ...o,
})

describe('buildChannelRows — 공헌이익(렌즈만)', () => {
  it('단가가 다 입력됐으면 수납액 − 렌즈원가로 계산한다', () => {
    const [r] = buildChannelRows(
      [
        funnelRow({
          surgeryAmount: 340_000_000,
          surgeryDonePersons: 100,
          surgeryPaidPersons: 100,
          reservedPersons: 200,
        }),
      ],
      [
        lensRow({
          lensEyes: 40,
          lensEyesPriced: 40,
          lensEyesUnpriced: 0,
          lensCostManwon: 3600,
        }),
      ],
    )
    expect(r.revenueManwon).toBe(34_000)
    expect(r.contribManwon).toBe(34_000 - 3600)
    expect(r.arpuManwon).toBe(340)
    expect(r.convRate).toBe(50)
  })

  it('단가 미입력 안이 하나라도 남으면 공헌이익을 내지 않는다', () => {
    // 0 을 원가로 쓰면 공헌이익이 실제보다 커 보이고, 그게 광고 예산 결정으로 이어진다.
    const [r] = buildChannelRows(
      [
        funnelRow({
          surgeryAmount: 340_000_000,
          surgeryDonePersons: 100,
          surgeryPaidPersons: 100,
        }),
      ],
      [
        lensRow({
          lensEyes: 40,
          lensEyesPriced: 12,
          lensEyesUnpriced: 28,
          lensCostManwon: 1080,
        }),
      ],
    )
    expect(r.lensCostManwon).toBe(1080)
    expect(r.contribManwon).toBeNull()
    expect(r.contribRate).toBeNull()
  })

  it('객단가 분모는 수술등록이 아니라 실제 수납이 잡힌 사람이다', () => {
    // 아직 수술 전인 사람(매출 0)을 분모에 넣으면 객단가가 낮게 나온다.
    const [r] = buildChannelRows(
      [
        funnelRow({
          surgeryAmount: 100_000_000,
          surgeryDonePersons: 40,
          surgeryPaidPersons: 25,
        }),
      ],
      [],
    )
    expect(r.arpuManwon).toBe(400)
  })

  it('표본 등급은 수술완료 인원으로 가른다', () => {
    const g = (n: number) =>
      buildChannelRows([funnelRow({ surgeryDonePersons: n })], [])[0].grade
    expect(g(11)).toBe('low')
    expect(g(45)).toBe('warn')
    expect(g(940)).toBe('ok')
  })
})

describe('cohortMaturity — 예약 코호트 성숙도', () => {
  // 관찰기간은 실측 분포다(2026-01~06 코호트 5,008건: p80 21일 · p90 33일 · p95 47일).
  // 임의의 90일이 아니라는 것이 이 테스트의 요점이다.
  const at = (iso: string) => new Date(`${iso}T12:00:00`)

  it('월말 +47일(p95)이 지나면 성과 확정이다', () => {
    // 2026-06 월말 = 06-30. +47일 = 08-16
    expect(cohortMaturity('2026-06', at('2026-08-16')).level).toBe('final')
  })

  it('월말 +33~46일은 거의 확정', () => {
    expect(cohortMaturity('2026-06', at('2026-08-02')).level).toBe('near')
  })

  it('월말 +21~32일은 관찰 중', () => {
    expect(cohortMaturity('2026-06', at('2026-07-21')).level).toBe('watching')
  })

  it('진행 중인 달은 미성숙이며 비교하지 말라고 알린다', () => {
    const m = cohortMaturity('2026-08', at('2026-08-07'))
    expect(m.level).toBe('early')
    expect(m.note).toContain('비교하면 안 됩니다')
  })

  it('임계값은 실측 분위수와 일치한다', () => {
    expect(COHORT_DAYS).toEqual({ p80: 21, p90: 33, p95: 47 })
  })
})
