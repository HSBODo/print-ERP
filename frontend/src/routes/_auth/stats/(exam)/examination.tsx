import { createFileRoute } from '@tanstack/react-router'

import { ExaminationPage } from '#domain/core/exam/ui/ExaminationPage'

export const Route = createFileRoute('/_auth/stats/(exam)/examination')({
  component: ExaminationPage,
  staticData: {
    page: {
      id: 'examination',
      label: '시술별',
      section: '검사',
      status: 'complete',
      access: { department: 'MEDICAL' },
    },
  },
})
