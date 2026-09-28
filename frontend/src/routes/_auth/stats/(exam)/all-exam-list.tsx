import { createFileRoute } from '@tanstack/react-router'
import { AllExamListPage } from '@/pages/exam/AllExamListPage'

export const Route = createFileRoute('/_auth/stats/(exam)/all-exam-list')({
  component: AllExamListPage,
  staticData: {
    page: {
      id: 'all-exam-list',
      label: '전체 검사자 리스트',
      section: '검사',
      status: 'complete',
      access: { department: 'MEDICAL' },
    },
  },
})
