import { createFileRoute } from '@tanstack/react-router'
import { SurgeryCompositionPage } from '@/pages/surgery/SurgeryCompositionPage'

export const Route = createFileRoute('/_auth/stats/(surgery)/surgery-composition')({
  component: SurgeryCompositionPage,
})
