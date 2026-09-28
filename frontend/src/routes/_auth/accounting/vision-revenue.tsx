import { createFileRoute } from '@tanstack/react-router'
import { VisionRevenuePage } from '@/pages/accounting/VisionRevenuePage'

export const Route = createFileRoute('/_auth/accounting/vision-revenue')({
  component: VisionRevenuePage,
})
