import { createFileRoute } from '@tanstack/react-router'
import { DreamlensLedgerPage } from '@/pages/etc/dreamlens-ledger/DreamlensLedgerPage'

export const Route = createFileRoute('/_auth/stats/(etc)/dreamlens-revenue')({
  component: DreamlensLedgerPage,
})
