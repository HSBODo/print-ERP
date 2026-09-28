import { createFileRoute } from '@tanstack/react-router'
import { AllExamListPage } from '@/pages/exam/AllExamListPage'

export const Route = createFileRoute('/_auth/stats/(exam)/all-exam-list')({
  component: AllExamListPage,
})
