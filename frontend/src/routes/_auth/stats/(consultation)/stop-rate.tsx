import { createFileRoute } from '@tanstack/react-router'
import { StopRatePage } from '#domain/core/overall/ui/StopRatePage'

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
