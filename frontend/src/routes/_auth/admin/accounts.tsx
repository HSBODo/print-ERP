import { createFileRoute } from '@tanstack/react-router'
import { AccountManagementPage } from '#domain/core/account/ui/AccountManagementPage'

export const Route = createFileRoute('/_auth/admin/accounts')({
  component: AccountManagementPage,
  staticData: {
    page: {
      id: 'account-management',
      label: '계정 관리',
      section: '관리자',
      status: 'complete',
      access: { role: 'ADMIN' },
    },
  },
})
