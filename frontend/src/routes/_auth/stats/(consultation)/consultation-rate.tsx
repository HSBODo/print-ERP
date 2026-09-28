import { createFileRoute } from '@tanstack/react-router'
import { ConsultationRatePage } from '@/pages/consultation/ConsultationRatePage'

export const Route = createFileRoute('/_auth/stats/(consultation)/consultation-rate')({
  component: ConsultationRatePage,
})
