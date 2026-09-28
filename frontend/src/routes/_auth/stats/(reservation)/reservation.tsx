import { createFileRoute } from '@tanstack/react-router'
import { ReservationPage } from '@/pages/reservation/ReservationPage'

export const Route = createFileRoute('/_auth/stats/(reservation)/reservation')({
  component: ReservationPage,
})
