import { createFileRoute } from '@tanstack/react-router'
import { NoShowRatePage } from '@/pages/cancel-noshow/NoShowRatePage'

export const Route = createFileRoute('/_auth/stats/(cancel-noshow)/no-show-rate')({
  component: NoShowRatePage,
})
