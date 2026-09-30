import { createFileRoute } from '@tanstack/react-router'

import { DashboardPage } from '#composition/dashboard/ui/DashboardPage'

export const Route = createFileRoute('/_auth/')({
  component: DashboardPage,
})
