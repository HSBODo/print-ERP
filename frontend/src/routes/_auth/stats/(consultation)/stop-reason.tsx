import { createFileRoute } from '@tanstack/react-router'
import { StopReasonPage } from '#domain/core/consultation/ui/StopReasonPage'

export const Route = createFileRoute('/_auth/stats/(consultation)/stop-reason')({
  component: StopReasonPage,
  staticData: {
    page: {
      id: 'stop-reason',
      label: '중단 사유',
      section: '전환&성공률',
      status: 'complete',
      access: { department: 'MEDICAL' },
    },
  },
})
