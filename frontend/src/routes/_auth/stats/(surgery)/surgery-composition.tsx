import { createFileRoute } from '@tanstack/react-router'
import { SurgeryCompositionPage } from '#domain/core/surgery/ui/SurgeryCompositionPage'

export const Route = createFileRoute('/_auth/stats/(surgery)/surgery-composition')({
  component: SurgeryCompositionPage,
  staticData: {
    page: {
      id: 'surgery-composition',
      label: '수술별 비중',
      section: '수술',
      status: 'complete',
      access: { department: 'MEDICAL' },
    },
  },
})
