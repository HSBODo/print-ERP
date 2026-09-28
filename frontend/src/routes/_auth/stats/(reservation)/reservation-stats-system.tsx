import { createFileRoute } from '@tanstack/react-router'
import { ReservationStatsSystemPage } from '@/pages/reservation/ReservationStatsSystemPage'

export const Route = createFileRoute('/_auth/stats/(reservation)/reservation-stats-system')({
  component: ReservationStatsSystemPage,
})
