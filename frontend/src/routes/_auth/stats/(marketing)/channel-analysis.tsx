import { createFileRoute } from '@tanstack/react-router'
import { ChannelAnalysisPage } from '@/pages/marketing/ChannelAnalysisPage'

export const Route = createFileRoute('/_auth/stats/(marketing)/channel-analysis')({
  component: ChannelAnalysisPage,
  staticData: {
    page: {
      id: 'channel-analysis',
      label: '채널별 분석',
      section: '마케팅',
      status: 'complete',
      access: { department: 'MARKETING' },
    },
  },
})
