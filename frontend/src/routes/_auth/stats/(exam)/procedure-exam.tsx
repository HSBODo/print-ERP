import { createFileRoute } from '@tanstack/react-router'

import { ProcedureExamPage } from '#domain/core/exam/ui/ProcedureExamPage'

export const Route = createFileRoute('/_auth/stats/(exam)/procedure-exam')({
  component: ProcedureExamPage,
  staticData: {
    page: {
      id: 'procedure-exam',
      label: '검사건수',
      section: '검사',
      status: 'complete',
      access: { department: 'MEDICAL' },
    },
  },
})
