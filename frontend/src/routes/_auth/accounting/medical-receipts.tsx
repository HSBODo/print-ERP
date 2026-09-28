import { createFileRoute } from '@tanstack/react-router'
import { MedicalReceiptsPage } from '@/pages/accounting/MedicalReceiptsPage'

export const Route = createFileRoute('/_auth/accounting/medical-receipts')({
  component: MedicalReceiptsPage,
  staticData: {
    page: {
      id: 'accounting-medical',
      label: '진료 수납',
      section: '회계',
      status: 'complete',
      access: { role: 'EXECUTIVE' },
    },
  },
})
