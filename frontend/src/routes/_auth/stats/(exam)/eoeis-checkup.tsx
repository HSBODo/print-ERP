import { createFileRoute } from '@tanstack/react-router'
import { EoeisCheckupStatsPage } from '@/pages/exam/EoeisCheckupStatsPage'

export const Route = createFileRoute('/_auth/stats/(exam)/eoeis-checkup')({
  component: EoeisCheckupStatsPage,
})
