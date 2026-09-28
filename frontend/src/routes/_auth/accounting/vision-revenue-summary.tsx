import { createFileRoute } from '@tanstack/react-router'
import { VisionRevenueSummaryPage } from '@/pages/accounting/VisionRevenueSummaryPage'

export const Route = createFileRoute('/_auth/accounting/vision-revenue-summary')({
  component: VisionRevenueSummaryPage,
})
