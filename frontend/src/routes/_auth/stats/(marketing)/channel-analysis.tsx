import { createFileRoute } from '@tanstack/react-router'
import { ChannelAnalysisPage } from '@/pages/marketing/ChannelAnalysisPage'

export const Route = createFileRoute('/_auth/stats/(marketing)/channel-analysis')({
  component: ChannelAnalysisPage,
})
