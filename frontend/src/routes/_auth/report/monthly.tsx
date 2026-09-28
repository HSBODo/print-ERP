import { createFileRoute } from '@tanstack/react-router'
import { MonthlyReportPage } from '@/pages/report/MonthlyReportPage'

export const Route = createFileRoute('/_auth/report/monthly')({
  component: MonthlyReportPage,
  staticData: {
    page: {
      id: 'monthly-report',
      label: '월간 레포트',
      section: 'Report',
      status: 'complete',
      access: { department: 'MEDICAL' },
    },
  },
})
