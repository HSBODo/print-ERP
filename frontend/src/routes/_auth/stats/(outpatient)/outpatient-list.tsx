import { createFileRoute } from '@tanstack/react-router'
import { OutpatientListPage } from '#domain/core/outpatient/ui/OutpatientListPage'

export const Route = createFileRoute('/_auth/stats/(outpatient)/outpatient-list')({
  component: OutpatientListPage,
  staticData: {
    page: {
      id: 'outpatient-list',
      label: '외래수 리스트',
      section: '외래',
      status: 'complete',
      access: { department: 'MEDICAL' },
    },
  },
})
