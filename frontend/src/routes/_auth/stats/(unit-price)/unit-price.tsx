import { createFileRoute } from '@tanstack/react-router'
import { UnitPricePage } from '@/pages/unit-price/UnitPricePage'

export const Route = createFileRoute('/_auth/stats/(unit-price)/unit-price')({
  component: UnitPricePage,
})
