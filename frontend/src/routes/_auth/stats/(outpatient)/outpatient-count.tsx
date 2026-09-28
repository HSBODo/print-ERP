import { createFileRoute } from '@tanstack/react-router'
import { OutpatientCountPage } from '@/pages/outpatient/OutpatientCountPage'

export const Route = createFileRoute('/_auth/stats/(outpatient)/outpatient-count')({
  component: OutpatientCountPage,
})
