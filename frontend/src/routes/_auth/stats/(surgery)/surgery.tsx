import { createFileRoute } from '@tanstack/react-router'
import { SurgeryPage } from '@/pages/surgery/SurgeryPage'

export const Route = createFileRoute('/_auth/stats/(surgery)/surgery')({
  component: SurgeryPage,
  staticData: {
    page: {
      id: 'surgery',
      label: '수술 건수',
      section: '수술 건수',
      status: 'complete',
      access: { role: 'ADMIN' },
    },
  },
})
