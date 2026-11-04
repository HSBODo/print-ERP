import { describe, expect, it } from 'vitest'

import { niceAxis, niceAxisFor, niceStep, tightAxis } from './niceAxis'

describe('niceStep', () => {
  it('범위를 1·2·5·10×10ⁿ nice step으로 환산', () => {
    expect(niceStep(61)).toBe(20) // 작은 카운트 범위
    expect(niceStep(2057)).toBe(500) // 외래수 범위
    expect(niceStep(4)).toBe(1) // 중단율 범위(%)
    expect(niceStep(31)).toBe(10) // 작은 비율 범위(%)
  })

  it('0 이하 범위는 1', () => {
    expect(niceStep(0)).toBe(1)
    expect(niceStep(-5)).toBe(1)
  })
})

describe('niceAxis', () => {
  it('작은 카운트는 0~120으로 떨어진다', () => {
    const { domain, ticks } = niceAxis([90, 67, 69, 42, 61, 36, 97])
    expect(domain).toEqual([0, 120])
    expect(ticks).toEqual([0, 20, 40, 60, 80, 100, 120])
  })

  it('큰 카운트(외래수)는 0이 아닌 baseline에서 시작(3000~6000)', () => {
    const { domain } = niceAxis([4822, 4339, 4247, 3653, 5389, 3332])
    expect(domain).toEqual([3000, 6000])
  })

  it('비율도 음수 없이 깔끔하게(중단율 0~9)', () => {
    const { domain } = niceAxis([4.4, 6, 7, 8, 5])
    expect(domain[0]).toBe(0)
    expect(domain[1]).toBe(9)
  })

  it('높고 촘촘한 비율은 음수 없이 baseline 상향', () => {
    const { domain } = niceAxis([49, 80, 64, 56, 55])
    expect(domain[0]).toBeGreaterThanOrEqual(0)
    expect(domain[0]).toBeLessThan(50)
    expect(domain[1]).toBeGreaterThanOrEqual(80)
  })

  it('어떤 입력도 하한이 음수가 되지 않는다', () => {
    expect(niceAxis([36, 97]).domain[0]).toBeGreaterThanOrEqual(0)
    expect(niceAxis([1, 2, 3]).domain[0]).toBeGreaterThanOrEqual(0)
  })

  it('값이 없으면 [0,1]', () => {
    expect(niceAxis([]).domain).toEqual([0, 1])
    expect(niceAxis([null, undefined]).domain).toEqual([0, 1])
  })
})

describe('tightAxis (주차 레포트 — 변동 폭 강조)', () => {
  /** 눈금이 전부 0 또는 5 로 끝나는지 (step ≥ 10 인 경우의 요구사항) */
  const endsInZeroOrFive = (ticks: number[]) =>
    ticks.every((t) => Number.isInteger(t) && (t % 10 === 0 || t % 10 === 5))

  it('좁은 범위(88~470): niceAxis 0~600 대비 축을 좁혀 데이터 비중을 높인다', () => {
    const values = [88, 470, 300, 250, 160, 200, 240]
    const loose = niceAxis(values)
    const tight = tightAxis(values)

    // 기존: 0~600 (데이터가 축의 64%)
    expect(loose.domain).toEqual([0, 600])
    // 개선: 하한이 0 에서 올라가고 상한도 내려온다
    expect(tight.domain[0]).toBeGreaterThan(0)
    expect(tight.domain[1]).toBeLessThan(600)

    const ratio = (r: [number, number]) => (470 - 88) / (r[1] - r[0])
    expect(ratio(tight.domain)).toBeGreaterThan(ratio(loose.domain))
  })

  it('눈금 값이 0·5 로 떨어진다', () => {
    expect(endsInZeroOrFive(tightAxis([88, 470, 300, 250]).ticks)).toBe(true)
    expect(endsInZeroOrFive(tightAxis([168, 608, 341]).ticks)).toBe(true)
    expect(endsInZeroOrFive(tightAxis([1200, 2900, 2100]).ticks)).toBe(true)
  })

  it('niceAxis 보다 눈금이 촘촘하다(8등분 기준)', () => {
    const values = [88, 470, 300, 250, 160]
    expect(tightAxis(values).ticks.length).toBeGreaterThan(
      niceAxis(values).ticks.length,
    )
  })

  it('데이터가 0 근처면 0 부터 그린다', () => {
    const { domain } = tightAxis([2, 5, 9, 14, 18])
    expect(domain[0]).toBe(0)
  })

  it('하한은 음수가 되지 않는다', () => {
    expect(tightAxis([1, 2, 3]).domain[0]).toBeGreaterThanOrEqual(0)
    expect(tightAxis([0, 500]).domain[0]).toBeGreaterThanOrEqual(0)
  })

  it('값이 없으면 [0,1]', () => {
    expect(tightAxis([]).domain).toEqual([0, 1])
    expect(tightAxis([null, undefined]).domain).toEqual([0, 1])
  })

  it('모든 데이터가 도메인 안에 들어온다', () => {
    const values = [88, 470, 300, 250, 160, 200, 240]
    const { domain } = tightAxis(values)
    expect(Math.min(...values)).toBeGreaterThanOrEqual(domain[0])
    expect(Math.max(...values)).toBeLessThanOrEqual(domain[1])
  })
})

describe('niceAxisFor (명시 범위 고정)', () => {
  it('고정 범위 [800,3000] → 끝값은 그대로, 사이는 1000·1500·…·3000', () => {
    const { domain, ticks } = niceAxisFor(800, 3000)
    expect(domain).toEqual([800, 3000])
    expect(ticks).toEqual([1000, 1500, 2000, 2500, 3000]) // 3500 없음
  })

  it('상한을 넘는 눈금은 만들지 않는다', () => {
    const { ticks } = niceAxisFor(800, 3000)
    expect(Math.max(...ticks)).toBeLessThanOrEqual(3000)
  })
})
