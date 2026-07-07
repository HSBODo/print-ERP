import type { FC } from 'react'
import { ConsultationRatePage } from './ConsultationRatePage'
import { CataractReservationRatePage } from './CataractReservationRatePage'
import { StopRatePage } from './StopRatePage'
import { StopReasonPage } from './StopReasonPage'

/** 전환&성공률(consultation) 도메인 페이지 레지스트리 */
export const consultationPageRoutes: Record<string, FC> = {
  'consultation-rate': ConsultationRatePage,
  'cataract-reservation-rate': CataractReservationRatePage,
  'stop-rate': StopRatePage,
  'stop-reason': StopReasonPage,
}
