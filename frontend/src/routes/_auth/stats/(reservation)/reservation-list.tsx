import { createFileRoute } from '@tanstack/react-router'
import { ReservationListPage } from '#domain/core/reservation/ui/ReservationListPage'

export const Route = createFileRoute(
  '/_auth/stats/(reservation)/reservation-list',
)({
  component: ReservationListPage,
  staticData: {
    page: {
      id: 'reservation-list',
      label: '예약자 리스트',
      section: '예약',
      status: 'complete',
      access: { department: 'MEDICAL' },
    },
  },
})
