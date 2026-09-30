import { createFileRoute } from '@tanstack/react-router'
import { AccumulatedEyesPage } from '#domain/core/marketing/ui/AccumulatedEyesPage'

export const Route = createFileRoute(
  '/_auth/stats/(marketing)/accumulated-eyes',
)({
  component: AccumulatedEyesPage,
  staticData: {
    page: {
      id: 'accumulated-eyes',
      label: '누적 안수',
      section: '마케팅',
      status: 'complete',
      access: { department: 'MARKETING' },
    },
  },
})
