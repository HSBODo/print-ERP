import { describe, expect, it } from 'vitest'

import {
  computeCataractChannelRow,
  type CataractStatsCounts,
} from './reservationStatsCataractFormulas'
import {
  computeSystemChannelRow,
  type SystemStatsCounts,
} from './reservationStatsSystemFormulas'

describe('reservation stats channel formulas', () => {
  it('computes system channel 예약율 as reservations ÷ totalReservation (with naver clamp)', () => {
    const counts: SystemStatsCounts = {
      inboundCall: 10,
      answeredCall: 8,
      newInquiry: 4,
      callReservation: 8,
      tmTotalDb: 20,
      tmValidDb: 10,
      tmReservation: 4,
      tmRecounsel: 5,
      tmRecounselValid: 3,
      tmRecounselReservation: 1,
      homeReceived: 4,
      homeReservation: 3,
      naverReceived: 0,
      naverRejected: 1,
      naverValid: -1,
      naverReservation: -2,
      kakaoInquiry: 5,
      kakaoReservation: 2,
      cancelCallNaver: 1,
      cancelHome: 2,
      cancelKakao: 3,
      visit: 0,
      noShowReservation: 0,
      cancel: 0,
    }

    expect(computeSystemChannelRow(counts, '1일')).toMatchObject({
      label: '1일',
      totalReservation: 18,
      callReservationRate: 44,
      naverValid: 0,
      naverReservation: 0,
      naverValidRate: 0,
      naverReservationRate: 0,
    })
  })

  it('keeps cataract total reservation calibrated from channel reservations', () => {
    const counts: CataractStatsCounts = {
      totalCataract: 999,
      totalPresbyopia: 2,
      inboundCall: 10,
      answeredCall: 8,
      newExamInquiry: 5,
      newReInquiry: 1,
      newPatient: 4,
      tmTotalDb: 6,
      tmValidDb: 4,
      tmReservation: 3,
      kakaoTotalInquiry: 7,
      kakaoCataractReservation: 2,
      kakaoPresbyopiaReservation: 1,
      onlineReservation: 1,
      onlineNoShow: 0,
      cancelOnline: 1,
      cancelCrm: 2,
      cancelKakao: 3,
      visit: 0,
      noShowReservation: 0,
      cancel: 0,
    }

    expect(computeCataractChannelRow(counts, 'TOTAL')).toMatchObject({
      label: 'TOTAL',
      totalCataract: 10,
      totalPresbyopia: 2,
      totalSum: 12,
      tmOutboundReservation: 3,
      inboundReservationRate: 80,
      tmTotalDbRate: 50,
      tmValidDbRate: 75,
    })
  })
})
