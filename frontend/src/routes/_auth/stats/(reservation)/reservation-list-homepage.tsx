import { createFileRoute } from '@tanstack/react-router'
import { ReservationListHomepagePage } from '@/pages/reservation/ReservationListHomepagePage'

export const Route = createFileRoute('/_auth/stats/(reservation)/reservation-list-homepage')({
  component: ReservationListHomepagePage,
})
