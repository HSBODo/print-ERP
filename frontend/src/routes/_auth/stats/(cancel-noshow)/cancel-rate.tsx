import { createFileRoute } from '@tanstack/react-router'
import { CancelRatePage } from '../../-internal/graveyard/CancelRatePage'

export const Route = createFileRoute('/_auth/stats/(cancel-noshow)/cancel-rate')({
  component: CancelRatePage,
  staticData: {
    page: {
      id: 'cancel-rate',
      label: '예약취소율',
      section: '취소&부도',
      status: 'pending',
      access: { department: 'MEDICAL' },
      apiDraftPath: '/api/stats/cancel-rate',
    },
  },
})
