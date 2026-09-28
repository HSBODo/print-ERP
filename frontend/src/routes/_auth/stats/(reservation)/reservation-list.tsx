import { createFileRoute } from '@tanstack/react-router'
import { ReservationListPage } from '@/pages/reservation/ReservationListPage'

export const Route = createFileRoute('/_auth/stats/(reservation)/reservation-list')({
  component: ReservationListPage,
})
