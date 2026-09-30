import { createFileRoute } from '@tanstack/react-router'
import { MedicalRevenueChartPage } from '#domain/core/accounting/ui/MedicalRevenueChartPage'

export const Route = createFileRoute('/_auth/accounting/medical-revenue-chart')(
  {
    component: MedicalRevenueChartPage,
    staticData: {
      page: {
        id: 'accounting-medical-chart',
        label: '진료 매출 그래프',
        section: '회계',
        status: 'complete',
        access: { role: 'EXECUTIVE' },
      },
    },
  },
)
