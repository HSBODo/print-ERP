import { createFileRoute } from '@tanstack/react-router'
import { VisionRevenueChartPage } from '@/pages/accounting/VisionRevenueChartPage'

export const Route = createFileRoute('/_auth/accounting/vision-revenue-chart')({
  component: VisionRevenueChartPage,
})
