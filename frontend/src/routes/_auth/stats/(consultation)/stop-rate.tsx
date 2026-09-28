import { createFileRoute } from '@tanstack/react-router'
import { StopRatePage } from '@/pages/consultation/StopRatePage'

export const Route = createFileRoute('/_auth/stats/(consultation)/stop-rate')({
  component: StopRatePage,
  staticData: {
    page: {
      id: 'stop-rate',
      label: '중단률',
      section: '전환&성공률',
      status: 'complete',
      access: { department: 'MEDICAL' },
    },
  },
})
