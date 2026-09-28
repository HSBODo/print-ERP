import { createFileRoute } from '@tanstack/react-router'
import { StopReasonPage } from '@/pages/consultation/StopReasonPage'

export const Route = createFileRoute('/_auth/stats/(consultation)/stop-reason')({
  component: StopReasonPage,
})
