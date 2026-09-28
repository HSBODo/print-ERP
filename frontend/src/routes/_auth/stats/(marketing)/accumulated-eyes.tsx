import { createFileRoute } from '@tanstack/react-router'
import { AccumulatedEyesPage } from '@/pages/marketing/AccumulatedEyesPage'

export const Route = createFileRoute('/_auth/stats/(marketing)/accumulated-eyes')({
  component: AccumulatedEyesPage,
})
