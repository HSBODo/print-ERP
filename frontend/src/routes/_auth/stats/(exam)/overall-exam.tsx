import { createFileRoute } from '@tanstack/react-router'
import { OverallExamPage } from '@/pages/exam/OverallExamPage'

export const Route = createFileRoute('/_auth/stats/(exam)/overall-exam')({
  component: OverallExamPage,
})
