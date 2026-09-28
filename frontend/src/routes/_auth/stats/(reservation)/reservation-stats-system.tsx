import { createFileRoute } from '@tanstack/react-router'
import { ReservationStatsSystemPage } from '@/pages/reservation/ReservationStatsSystemPage'

export const Route = createFileRoute('/_auth/stats/(reservation)/reservation-stats-system')({
  component: ReservationStatsSystemPage,
  staticData: {
    page: {
      id: 'reservation-stats-system',
      label: '예약통계_시력교정',
      section: '예약',
      status: 'complete',
      access: { department: 'MEDICAL' },
    },
  },
})
