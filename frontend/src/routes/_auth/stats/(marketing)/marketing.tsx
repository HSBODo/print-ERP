import { createFileRoute } from '@tanstack/react-router'
import { MarketingPage } from '@/pages/marketing/MarketingPage'

export const Route = createFileRoute('/_auth/stats/(marketing)/marketing')({
  component: MarketingPage,
})
