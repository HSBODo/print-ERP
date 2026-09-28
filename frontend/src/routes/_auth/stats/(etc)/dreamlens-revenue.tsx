import { createFileRoute } from '@tanstack/react-router'
import { DreamlensLedgerPage } from '@/pages/etc/dreamlens-ledger/DreamlensLedgerPage'

export const Route = createFileRoute('/_auth/stats/(etc)/dreamlens-revenue')({
  component: DreamlensLedgerPage,
  staticData: {
    page: {
      id: 'dreamlens-revenue',
      label: '드림렌즈 장부',
      section: '기타',
      status: 'complete',
      access: { department: 'MEDICAL' },
    },
  },
})
