import { createFileRoute } from '@tanstack/react-router'
import { StopRatePage } from '@/pages/consultation/StopRatePage'

export const Route = createFileRoute('/_auth/stats/(consultation)/stop-rate')({
  component: StopRatePage,
})
