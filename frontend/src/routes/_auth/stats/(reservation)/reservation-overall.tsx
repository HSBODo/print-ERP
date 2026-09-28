import { createFileRoute } from '@tanstack/react-router'
import { ReservationOverallPage } from '#domain/core/reservation/ui/ReservationOverallPage'

export const Route = createFileRoute('/_auth/stats/(reservation)/reservation-overall')({
  component: ReservationOverallPage,
  staticData: {
    page: {
      id: 'reservation-overall',
      label: '예약 종합',
      section: '예약',
      status: 'complete',
      access: { department: 'MEDICAL' },
    },
  },
})
