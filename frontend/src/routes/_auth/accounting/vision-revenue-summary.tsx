import { createFileRoute } from '@tanstack/react-router'
import { VisionRevenueSummaryPage } from '#domain/core/accounting/ui/VisionRevenueSummaryPage'

export const Route = createFileRoute('/_auth/accounting/vision-revenue-summary')({
  component: VisionRevenueSummaryPage,
  staticData: {
    page: {
      id: 'accounting-vision-summary',
      label: '시력교정 매출 집계',
      section: '회계',
      status: 'complete',
      access: { role: 'EXECUTIVE' },
    },
  },
})
