import { createFileRoute } from '@tanstack/react-router'
import { OverseasMarketingReceptionPage } from '@/pages/marketing/OverseasMarketingReceptionPage'

export const Route = createFileRoute('/_auth/stats/(marketing)/overseas-marketing/receptions')({
  component: OverseasMarketingReceptionPage,
})
