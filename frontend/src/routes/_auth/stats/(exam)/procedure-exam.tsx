import { createFileRoute } from '@tanstack/react-router'
import { ProcedureExamPage } from '@/pages/exam/ProcedureExamPage'

export const Route = createFileRoute('/_auth/stats/(exam)/procedure-exam')({
  component: ProcedureExamPage,
})
