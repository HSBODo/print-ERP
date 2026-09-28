import { createFileRoute } from '@tanstack/react-router'
import { CataractReservationRatePage } from '@/pages/consultation/CataractReservationRatePage'

export const Route = createFileRoute('/_auth/stats/(consultation)/cataract-reservation-rate')({
  component: CataractReservationRatePage,
})
