import { createFileRoute } from '@tanstack/react-router'
import { ReservationPage } from '#domain/core/reservation/ui/ReservationPage'

export const Route = createFileRoute('/_auth/stats/(reservation)/reservation')({
  component: ReservationPage,
  staticData: {
    page: {
      id: 'reservation',
      label: '예약 건수',
      section: '예약',
      status: 'complete',
      access: { department: 'MEDICAL' },
    },
  },
})
