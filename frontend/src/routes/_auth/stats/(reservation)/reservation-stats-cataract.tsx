import { createFileRoute } from '@tanstack/react-router'
import { ReservationStatsCataractPage } from '#domain/core/reservationStats/ui/ReservationStatsCataractPage'

export const Route = createFileRoute(
  '/_auth/stats/(reservation)/reservation-stats-cataract',
)({
  component: ReservationStatsCataractPage,
  staticData: {
    page: {
      id: 'reservation-stats-cataract',
      label: '예약통계_백내장',
      section: '예약',
      status: 'complete',
      access: { department: 'MEDICAL' },
    },
  },
})
