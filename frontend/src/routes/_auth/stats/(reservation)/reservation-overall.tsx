import { createFileRoute } from '@tanstack/react-router'
import { ReservationOverallPage } from '@/pages/reservation/ReservationOverallPage'

export const Route = createFileRoute('/_auth/stats/(reservation)/reservation-overall')({
  component: ReservationOverallPage,
})
