import { createFileRoute } from '@tanstack/react-router'
import { OverallExamWeeklyPage } from '@/pages/exam/OverallExamWeeklyPage'

export const Route = createFileRoute('/_auth/stats/(exam)/overall-exam-weekly')({
  component: OverallExamWeeklyPage,
})
