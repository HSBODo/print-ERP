import { createFileRoute } from '@tanstack/react-router'
import { OutpatientCountPage } from '@/pages/outpatient/OutpatientCountPage'

export const Route = createFileRoute('/_auth/stats/(outpatient)/outpatient-count')({
  component: OutpatientCountPage,
  staticData: {
    page: {
      id: 'outpatient-count',
      label: '외래수',
      section: '외래',
      status: 'complete',
      access: { department: 'MEDICAL' },
    },
  },
})
