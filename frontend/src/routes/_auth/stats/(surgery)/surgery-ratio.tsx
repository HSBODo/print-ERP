import { createFileRoute } from '@tanstack/react-router'
import { SurgeryRatioPage } from '#domain/core/surgery/ui/SurgeryRatioPage'

export const Route = createFileRoute('/_auth/stats/(surgery)/surgery-ratio')({
  component: SurgeryRatioPage,
  staticData: {
    page: {
      id: 'surgery-ratio',
      label: '주요 수술별 비중',
      section: '주요 수술별 비중',
      status: 'complete',
      access: { department: 'MEDICAL' },
    },
  },
})
