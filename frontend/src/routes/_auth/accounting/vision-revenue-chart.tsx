import { createFileRoute } from '@tanstack/react-router'

import { VisionRevenueChartPage } from '#domain/core/accounting/ui/VisionRevenueChartPage'

export const Route = createFileRoute('/_auth/accounting/vision-revenue-chart')({
  component: VisionRevenueChartPage,
  staticData: {
    page: {
      id: 'accounting-vision-chart',
      label: '시력교정 매출 그래프',
      section: '회계',
      status: 'complete',
      access: { role: 'EXECUTIVE' },
    },
  },
})
