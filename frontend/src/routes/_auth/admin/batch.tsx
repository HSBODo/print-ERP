import { createFileRoute } from '@tanstack/react-router'

import { BatchManagementPage } from '#domain/core/batch/ui/BatchManagementPage'

export const Route = createFileRoute('/_auth/admin/batch')({
  component: BatchManagementPage,
  staticData: {
    page: {
      id: 'batch-management',
      label: '데이터 배치 관리',
      section: '관리자',
      status: 'complete',
      access: { role: 'ADMIN' },
    },
  },
})
