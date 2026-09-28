import { createFileRoute } from '@tanstack/react-router'
import { CataractExamListPage } from '@/pages/exam/CataractExamListPage'

export const Route = createFileRoute('/_auth/stats/(exam)/cataract-exam-list')({
  component: CataractExamListPage,
})
