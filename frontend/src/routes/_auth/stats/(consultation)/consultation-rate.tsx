import { createFileRoute } from '@tanstack/react-router'

import { ConsultationRatePage } from '#domain/core/consultation/ui/ConsultationRatePage'

export const Route = createFileRoute(
  '/_auth/stats/(consultation)/consultation-rate',
)({
  component: ConsultationRatePage,
  staticData: {
    page: {
      id: 'consultation-rate',
      label: '전환율',
      section: '전환&성공률',
      status: 'complete',
      access: { role: 'ADMIN' },
    },
  },
})
