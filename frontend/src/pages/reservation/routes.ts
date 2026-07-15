import type { FC } from 'react'
import { IntakeConversionPage } from './IntakeConversionPage'
import { ReservationPage } from './ReservationPage'
import { ReservationOverallPage } from './ReservationOverallPage'
import { ReservationStatsSystemPage } from './ReservationStatsSystemPage'
import { ReservationStatsCataractPage } from './ReservationStatsCataractPage'
import { ReservationListPage } from './ReservationListPage'
import { ReservationListHomepagePage } from './ReservationListHomepagePage'

/** 예약(reservation) 도메인 페이지 레지스트리 */
export const reservationPageRoutes: Record<string, FC> = {
  'intake-conversion': IntakeConversionPage,
  'reservation': ReservationPage,
  'reservation-overall': ReservationOverallPage,
  'reservation-stats-system': ReservationStatsSystemPage,
  'reservation-stats-cataract': ReservationStatsCataractPage,
  'reservation-list': ReservationListPage,
  'reservation-list-homepage': ReservationListHomepagePage,
}
