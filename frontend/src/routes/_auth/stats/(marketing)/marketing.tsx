import { createFileRoute } from '@tanstack/react-router'
import { MarketingPage } from '@/pages/marketing/MarketingPage'

export const Route = createFileRoute('/_auth/stats/(marketing)/marketing')({
  component: MarketingPage,
  staticData: {
    page: {
      id: 'marketing',
      label: '마케팅 유입 및 효율 지표',
      section: '마케팅 유입 및 효율 지표',
      status: 'pending',
      access: { department: 'MARKETING' },
      apiDraftPath: '/api/stats/marketing',
    },
  },
})
