import { createFileRoute } from '@tanstack/react-router'
import { ReservationChangePage } from '@/pages/reservation/ReservationChangePage'

export const Route = createFileRoute('/_auth/stats/(reservation)/reservation-change')({
  component: ReservationChangePage,
})
