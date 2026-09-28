import { createFileRoute } from '@tanstack/react-router'
import { NoShowRatePage } from '@/pages/cancel-noshow/NoShowRatePage'

export const Route = createFileRoute('/_auth/stats/(cancel-noshow)/no-show-rate')({
  component: NoShowRatePage,
  staticData: {
    page: {
      id: 'no-show-rate',
      label: '부도율',
      section: '취소&부도',
      status: 'pending',
      access: { department: 'MEDICAL' },
      apiDraftPath: '/api/stats/no-show-rate',
    },
  },
})
