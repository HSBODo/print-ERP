import { createFileRoute } from '@tanstack/react-router'
import { OutpatientListPage } from '@/pages/outpatient/OutpatientListPage'

export const Route = createFileRoute('/_auth/stats/(outpatient)/outpatient-list')({
  component: OutpatientListPage,
})
