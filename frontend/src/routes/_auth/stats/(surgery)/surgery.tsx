import { createFileRoute } from '@tanstack/react-router'
import { SurgeryPage } from '@/pages/surgery/SurgeryPage'

export const Route = createFileRoute('/_auth/stats/(surgery)/surgery')({
  component: SurgeryPage,
})
