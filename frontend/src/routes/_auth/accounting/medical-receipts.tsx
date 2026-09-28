import { createFileRoute } from '@tanstack/react-router'
import { MedicalReceiptsPage } from '@/pages/accounting/MedicalReceiptsPage'

export const Route = createFileRoute('/_auth/accounting/medical-receipts')({
  component: MedicalReceiptsPage,
})
