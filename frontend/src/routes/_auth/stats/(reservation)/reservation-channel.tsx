import { createFileRoute } from '@tanstack/react-router'
import { ReservationChannelPage } from '@/pages/reservation/ReservationChannelPage'

export const Route = createFileRoute('/_auth/stats/(reservation)/reservation-channel')({
  component: ReservationChannelPage,
})
