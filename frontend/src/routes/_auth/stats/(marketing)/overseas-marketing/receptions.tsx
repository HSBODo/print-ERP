import { createFileRoute } from '@tanstack/react-router'
import { OverseasMarketingReceptionPage } from '#domain/core/overseasMarketing/ui/OverseasMarketingReceptionPage'

export const Route = createFileRoute('/_auth/stats/(marketing)/overseas-marketing/receptions')({
  component: OverseasMarketingReceptionPage,
  staticData: {
    page: {
      id: 'overseas-marketing-receptions',
      label: '접수리스트',
      section: '해외마케팅',
      status: 'complete',
      access: { department: 'OVERSEAS_MARKETING' },
    },
  },
})
