import { createFileRoute } from '@tanstack/react-router'
import { ChannelProfitPage } from '@/pages/marketing/ChannelProfitPage'

export const Route = createFileRoute('/_auth/stats/(marketing)/channel-profit')({
  component: ChannelProfitPage,
})
