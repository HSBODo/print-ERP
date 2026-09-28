import { createFileRoute } from '@tanstack/react-router'
import { CataractExamListPage } from '@/pages/exam/CataractExamListPage'

export const Route = createFileRoute('/_auth/stats/(exam)/cataract-exam-list')({
  component: CataractExamListPage,
  staticData: {
    page: {
      id: 'cataract-exam-list',
      label: '백내장 검사자 리스트',
      section: '검사',
      status: 'complete',
      access: { role: 'ADMIN' },
    },
  },
})
