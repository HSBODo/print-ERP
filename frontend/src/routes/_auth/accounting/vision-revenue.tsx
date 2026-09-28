import { createFileRoute } from '@tanstack/react-router'
import { VisionRevenuePage } from '@/pages/accounting/VisionRevenuePage'

export const Route = createFileRoute('/_auth/accounting/vision-revenue')({
  component: VisionRevenuePage,
  staticData: {
    page: {
      id: 'accounting-vision',
      label: '시력교정 매출 내역',
      section: '회계',
      status: 'complete',
      access: { role: 'EXECUTIVE' },
    },
  },
})
