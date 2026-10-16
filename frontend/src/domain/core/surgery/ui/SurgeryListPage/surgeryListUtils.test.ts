import { describe, expect, it } from 'vitest'

import {
  classifyCataract,
  classifyReoperation,
  classifyVision,
  matchesCataract,
  matchesOption,
  matchesReoperation,
  matchesSurgeryType,
} from './surgeryListUtils'

const row = (surgeryR: string, surgeryL = '') => ({ surgeryR, surgeryL })

describe('classifyVision — SQL CASE 와 같은 판정 순서', () => {
  it('PRESBYOND 가 가장 먼저다 (섞인 표기도 노안으로)', () => {
    expect(classifyVision('PRESBYOND')).toBe('presbyond')
    expect(classifyVision('Mono+PRESBYOND')).toBe('presbyond')
    expect(classifyVision('PRESBYOND+NEAR+(P)')).toBe('presbyond')
  })

  it('스마일프로가 스마일보다 먼저 걸린다', () => {
    expect(classifyVision('SMILE Pro')).toBe('smilePro')
    expect(classifyVision('SMILE')).toBe('smile')
  })

  it('T-ICL 이 ICL 보다, T-KPL 이 KPL 보다 먼저 걸린다', () => {
    expect(classifyVision('EVOp T-ICL')).toBe('tIcl')
    expect(classifyVision('EVOp ICL')).toBe('icl')
    expect(classifyVision('T-KPL')).toBe('tKpl')
    expect(classifyVision('KPL')).toBe('kpl')
  })

  it('VIVA 가 ICL 보다 먼저다 — VIVA ICL 은 VIVA', () => {
    expect(classifyVision('VIVA ICL')).toBe('viva')
  })

  it('운영 DB 가 대소문자를 안 가리므로 여기서도 안 가린다', () => {
    expect(classifyVision('evop t-icl')).toBe('tIcl')
    expect(classifyVision('smile pro')).toBe('smilePro')
  })

  it('빈 값과 미분류는 other', () => {
    expect(classifyVision('')).toBe('other')
    expect(classifyVision('   ')).toBe('other')
    expect(classifyVision('처음보는수술명')).toBe('other')
  })
})

describe('classifyCataract — EDOF 를 먼저 본다', () => {
  it('T-Clareon Vivity 는 Clareon 이 아니라 Vivity(EDOF)로 간다', () => {
    expect(classifyCataract('T-Clareon Vivity')).toBe('catEdof')
  })

  it('Clareon 단독은 다초점', () => {
    expect(classifyCataract('Clareon')).toBe('catMulti')
  })

  it('목록에 없으면 단초점(ELSE)', () => {
    expect(classifyCataract('K-flex')).toBe('catMono')
    expect(classifyCataract('처음보는렌즈')).toBe('catMono')
  })
})

describe('classifyReoperation', () => {
  it('렌즈 키워드가 있으면 렌즈, 없으면 레이저', () => {
    expect(classifyReoperation('EVO ICL remove')).toBe('reopLens')
    expect(classifyReoperation('FLAP LIFT')).toBe('reopLaser')
  })
})

describe('필터 판정 — 양안이면 우안, 단안이면 수술한 쪽', () => {
  it('양안: 우안 수술로만 판정한다 (비중 표의 대표유형과 같은 기준)', () => {
    const r = row('EVOp ICL', 'EVOp T-ICL')
    expect(matchesSurgeryType(r, 'ICL')).toBe(true)
    expect(matchesSurgeryType(r, 'T-ICL')).toBe(false)
    expect(matchesSurgeryType(r, 'KPL')).toBe(false)
  })

  it('단안: 수술한 쪽으로 판정한다', () => {
    expect(matchesSurgeryType(row('', 'SMILE'), '스마일')).toBe(true)
    expect(matchesSurgeryType(row('SMILE', ''), '스마일')).toBe(true)
    expect(matchesCataract(row('', 'K-flex'), '단초점')).toBe(true)
  })

  it('옵션: 모노는 앞부분이 MONO 로 시작할 때만', () => {
    expect(matchesOption(row('Mono+EVO ICL'), '모노')).toBe(true)
    expect(matchesOption(row('EVO ICL Mono'), '모노')).toBe(false)
    expect(matchesOption(row('SMILE+X'), '엑스트라')).toBe(true)
  })

  it('백내장: 빈 눈은 단초점으로 오분류하지 않는다', () => {
    expect(matchesCataract(row('Clareon', ''), '단초점')).toBe(false)
    expect(matchesCataract(row('K-flex', ''), '단초점')).toBe(true)
  })

  it('재수술: 빈 눈은 레이저로 오분류하지 않는다', () => {
    expect(matchesReoperation(row('EVO ICL', ''), '레이저')).toBe(false)
    expect(matchesReoperation(row('EVO ICL', ''), '렌즈')).toBe(true)
  })

  it("'전체'는 항상 통과", () => {
    const r = row('')
    expect(matchesSurgeryType(r, '전체')).toBe(true)
    expect(matchesOption(r, '전체')).toBe(true)
    expect(matchesCataract(r, '전체')).toBe(true)
    expect(matchesReoperation(r, '전체')).toBe(true)
  })
})
