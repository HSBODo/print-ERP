import { createFileRoute } from '@tanstack/react-router'
import { OverseasPage } from '@/pages/marketing/OverseasPage'

export const Route = createFileRoute('/_auth/stats/(marketing)/overseas-marketing/statistics')({
  component: OverseasPage,
})
