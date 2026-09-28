import { createFileRoute } from '@tanstack/react-router'
import { SurgeryListPage } from '@/pages/surgery/SurgeryListPage'

export const Route = createFileRoute('/_auth/stats/(surgery)/surgery-list')({
  component: SurgeryListPage,
})
