import { createFileRoute } from '@tanstack/react-router'
import { CancelRatePage } from '@/pages/cancel-noshow/CancelRatePage'

export const Route = createFileRoute('/_auth/stats/(cancel-noshow)/cancel-rate')({
  component: CancelRatePage,
})
