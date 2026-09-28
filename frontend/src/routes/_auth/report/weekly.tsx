import { createFileRoute } from '@tanstack/react-router'
import { WeeklyReportPage } from '@/pages/report/WeeklyReportPage'

export const Route = createFileRoute('/_auth/report/weekly')({
  component: WeeklyReportPage,
})
