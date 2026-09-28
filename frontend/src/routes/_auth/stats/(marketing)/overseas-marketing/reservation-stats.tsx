import { createFileRoute } from '@tanstack/react-router'
import { OverseasReservationStatsPage } from '@/pages/marketing/OverseasReservationStatsPage'

export const Route = createFileRoute('/_auth/stats/(marketing)/overseas-marketing/reservation-stats')({
  component: OverseasReservationStatsPage,
})
