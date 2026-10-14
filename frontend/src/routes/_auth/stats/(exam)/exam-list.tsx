import { createFileRoute } from '@tanstack/react-router'

import { ExamListPage } from '#domain/core/exam/ui/ExamListPage'

export const Route = createFileRoute('/_auth/stats/(exam)/exam-list')({
  component: ExamListPage,
  staticData: {
    page: {
      id: 'exam-list',
      label: '검사자 리스트',
      section: '검사',
      status: 'complete',
      access: { role: 'ADMIN' },
    },
  },
})
