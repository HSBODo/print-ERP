import { createFileRoute } from '@tanstack/react-router'
import { AccountManagementPage } from '@/pages/admin/AccountManagementPage'

export const Route = createFileRoute('/_auth/admin/accounts')({
  component: AccountManagementPage,
})
