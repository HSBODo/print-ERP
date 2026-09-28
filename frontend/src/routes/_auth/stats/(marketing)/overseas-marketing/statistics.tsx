import { createFileRoute } from '@tanstack/react-router'
import { OverseasPage } from '#domain/core/overseasMarketing/ui/OverseasPage'

export const Route = createFileRoute('/_auth/stats/(marketing)/overseas-marketing/statistics')({
  component: OverseasPage,
  staticData: {
    page: {
      id: 'overseas-marketing-statistics',
      label: '통계',
      section: '해외마케팅',
      status: 'complete',
      access: { department: 'OVERSEAS_MARKETING' },
    },
  },
})
