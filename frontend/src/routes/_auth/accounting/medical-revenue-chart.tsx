import { createFileRoute } from '@tanstack/react-router'
import { MedicalRevenueChartPage } from '@/pages/accounting/MedicalRevenueChartPage'

export const Route = createFileRoute('/_auth/accounting/medical-revenue-chart')({
  component: MedicalRevenueChartPage,
})
