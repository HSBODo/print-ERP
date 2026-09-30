import { createFileRoute } from '@tanstack/react-router'
import { OverseasReservationStatsPage } from '#domain/core/overseasMarketing/ui/OverseasReservationStatsPage'

export const Route = createFileRoute(
  '/_auth/stats/(marketing)/overseas-marketing/reservation-stats',
)({
  component: OverseasReservationStatsPage,
  staticData: {
    page: {
      id: 'overseas-reservation-stats',
      label: '예약통계',
      section: '해외마케팅',
      status: 'complete',
      access: { department: 'OVERSEAS_MARKETING' },
    },
  },
})
