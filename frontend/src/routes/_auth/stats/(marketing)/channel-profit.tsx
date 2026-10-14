import { createFileRoute } from '@tanstack/react-router'

import { ChannelProfitPage } from '#domain/core/marketing/ui/ChannelProfitPage'

export const Route = createFileRoute('/_auth/stats/(marketing)/channel-profit')(
  {
    component: ChannelProfitPage,
    staticData: {
      page: {
        id: 'channel-profit',
        label: '채널별 수익성',
        section: '마케팅',
        status: 'complete',
        access: { department: 'MARKETING' },
      },
    },
  },
)
