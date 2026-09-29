import { createFileRoute } from '@tanstack/react-router'
import { WeeklyReportPage } from '#composition/report/ui/WeeklyReportPage'

export const Route = createFileRoute('/_auth/report/weekly')({
  component: WeeklyReportPage,
  staticData: {
    page: {
      id: 'weekly-report',
      label: '주차 레포트',
      section: 'Report',
      status: 'complete',
      access: { department: 'MEDICAL' },
    },
  },
})
