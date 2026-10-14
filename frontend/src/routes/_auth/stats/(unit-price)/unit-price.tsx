import { createFileRoute } from '@tanstack/react-router'

import { UnitPricePage } from '../../-internal/graveyard/UnitPricePage'

export const Route = createFileRoute('/_auth/stats/(unit-price)/unit-price')({
  component: UnitPricePage,
  staticData: {
    page: {
      id: 'unit-price',
      label: '객단가',
      section: '객단가',
      status: 'pending',
      access: { department: 'MEDICAL' },
      apiDraftPath: '/api/stats/unit-price',
    },
  },
})
