import { createFileRoute } from '@tanstack/react-router'
import { ReservationChangePage } from '#domain/core/reservation/ui/ReservationChangePage'

export const Route = createFileRoute(
  '/_auth/stats/(reservation)/reservation-change',
)({
  component: ReservationChangePage,
  staticData: {
    page: {
      id: 'reservation-change',
      label: '예약 변경이력',
      section: '예약',
      status: 'complete',
      access: { department: 'MEDICAL' },
    },
  },
})
