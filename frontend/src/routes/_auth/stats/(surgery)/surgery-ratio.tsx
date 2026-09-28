import { createFileRoute } from '@tanstack/react-router'
import { SurgeryRatioPage } from '@/pages/surgery/SurgeryRatioPage'

export const Route = createFileRoute('/_auth/stats/(surgery)/surgery-ratio')({
  component: SurgeryRatioPage,
})
