import { createFileRoute } from '@tanstack/react-router'
import { CataractReservationRatePage } from '#domain/core/consultation/ui/CataractReservationRatePage'

export const Route = createFileRoute(
  '/_auth/stats/(consultation)/cataract-reservation-rate',
)({
  component: CataractReservationRatePage,
  staticData: {
    page: {
      id: 'cataract-reservation-rate',
      label: '예약률',
      section: '전환&성공률',
      status: 'complete',
      access: { department: 'MEDICAL' },
    },
  },
})
