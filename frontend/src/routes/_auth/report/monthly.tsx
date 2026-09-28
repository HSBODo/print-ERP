import { createFileRoute } from '@tanstack/react-router'
import { MonthlyReportPage } from '@/pages/report/MonthlyReportPage'

export const Route = createFileRoute('/_auth/report/monthly')({
  component: MonthlyReportPage,
})
