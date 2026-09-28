import { createFileRoute } from '@tanstack/react-router'
import { ExamListPage } from '@/pages/exam/ExamListPage'

export const Route = createFileRoute('/_auth/stats/(exam)/exam-list')({
  component: ExamListPage,
})
