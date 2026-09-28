import { createFileRoute } from '@tanstack/react-router'
import { ReservationChannelPage } from '@/pages/reservation/ReservationChannelPage'

export const Route = createFileRoute('/_auth/stats/(reservation)/reservation-channel')({
  component: ReservationChannelPage,
  staticData: {
    page: {
      id: 'reservation-channel',
      label: '예약 퍼널',
      section: '마케팅',
      status: 'complete',
      access: { department: 'MARKETING' },
    },
  },
})
