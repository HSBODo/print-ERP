import { createFileRoute } from '@tanstack/react-router'
import { OverallExamWeeklyPage } from '@/pages/exam/OverallExamWeeklyPage'

export const Route = createFileRoute('/_auth/stats/(exam)/overall-exam-weekly')({
  component: OverallExamWeeklyPage,
  staticData: {
    page: {
      id: 'overall-exam-weekly',
      label: '주간 검사자 종합지표',
      section: '검사',
      status: 'complete',
      access: { role: 'ADMIN' },
    },
  },
})
