import { createFileRoute } from '@tanstack/react-router'

import { ReservationListHomepagePage } from '#domain/core/reservation/ui/ReservationListHomepagePage'

export const Route = createFileRoute(
  '/_auth/stats/(reservation)/reservation-list-homepage',
)({
  component: ReservationListHomepagePage,
  staticData: {
    page: {
      id: 'reservation-list-homepage',
      label: '예약자 리스트_홈페이지',
      section: '예약',
      status: 'complete',
      access: { department: 'MEDICAL' },
    },
  },
})
