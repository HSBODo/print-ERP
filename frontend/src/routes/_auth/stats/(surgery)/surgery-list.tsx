import { createFileRoute } from '@tanstack/react-router'
import { SurgeryListPage } from '@/pages/surgery/SurgeryListPage'

export const Route = createFileRoute('/_auth/stats/(surgery)/surgery-list')({
  component: SurgeryListPage,
  staticData: {
    page: {
      id: 'surgery-list',
      label: '수술자 리스트',
      section: '수술 건수',
      status: 'complete',
      access: { department: 'MEDICAL' },
    },
  },
})
