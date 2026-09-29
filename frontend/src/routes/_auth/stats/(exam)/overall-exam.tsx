import { createFileRoute } from '@tanstack/react-router'
import { OverallExamPage } from '#domain/core/overall/ui/OverallExamPage'

export const Route = createFileRoute('/_auth/stats/(exam)/overall-exam')({
  component: OverallExamPage,
  staticData: {
    page: {
      id: 'overall-exam',
      label: '월별 검사자 종합지표',
      section: '검사',
      status: 'complete',
      access: { role: 'ADMIN' },
    },
  },
})
