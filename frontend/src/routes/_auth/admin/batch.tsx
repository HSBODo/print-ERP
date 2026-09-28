import { createFileRoute } from '@tanstack/react-router'
import { BatchManagementPage } from '@/pages/admin/BatchManagementPage'

export const Route = createFileRoute('/_auth/admin/batch')({
  component: BatchManagementPage,
})
