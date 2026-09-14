import type { FC } from 'react'
import { ReservationPage } from './ReservationPage'
import { ReservationOverallPage } from './ReservationOverallPage'
import { ReservationStatsSystemPage } from './ReservationStatsSystemPage'
import { ReservationStatsCataractPage } from './ReservationStatsCataractPage'
import { ReservationListPage } from './ReservationListPage'
import { ReservationChannelPage } from './ReservationChannelPage'
import { ReservationListHomepagePage } from './ReservationListHomepagePage'
import { ReservationChangePage } from './ReservationChangePage'

/** 예약(reservation) 도메인 페이지 레지스트리 */
export const reservationPageRoutes: Record<string, FC> = {
  'reservation': ReservationPage,
  'reservation-overall': ReservationOverallPage,
  'reservation-stats-system': ReservationStatsSystemPage,
  'reservation-stats-cataract': ReservationStatsCataractPage,
  'reservation-list': ReservationListPage,
  'reservation-channel': ReservationChannelPage,
  'reservation-list-homepage': ReservationListHomepagePage,
  'reservation-change': ReservationChangePage,
}
