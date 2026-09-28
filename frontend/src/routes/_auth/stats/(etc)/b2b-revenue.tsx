import { createFileRoute } from '@tanstack/react-router'
import { B2BRevenuePage } from '@/pages/etc/B2BRevenuePage'

export const Route = createFileRoute('/_auth/stats/(etc)/b2b-revenue')({
  component: B2BRevenuePage,
})
