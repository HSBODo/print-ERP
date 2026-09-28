import { createFileRoute } from '@tanstack/react-router'
import { ReservationStatsCataractPage } from '@/pages/reservation/ReservationStatsCataractPage'

export const Route = createFileRoute('/_auth/stats/(reservation)/reservation-stats-cataract')({
  component: ReservationStatsCataractPage,
})
