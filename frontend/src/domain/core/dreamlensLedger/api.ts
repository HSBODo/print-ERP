import { api } from '#shared/api/client'

import {
  type DreamlensLedgerRow,
  type DreamlensLedgerRequest,
  ledgerListSchema,
  ledgerRowSchema,
} from './type/api'

const toRequest = (row: DreamlensLedgerRow | DreamlensLedgerRequest): DreamlensLedgerRequest => {
  const { ...rest } = row as DreamlensLedgerRow
  delete (rest as Partial<DreamlensLedgerRow>).id
  delete (rest as Partial<DreamlensLedgerRow>).totalRevenue
  delete (rest as Partial<DreamlensLedgerRow>).source
  return rest
}

export const dreamlensLedgerApi = {
  list: async (from: string, to: string, signal?: AbortSignal) => {
    const { data } = await api.get('/dreamlens-ledger', { params: { from, to }, signal })
    return ledgerListSchema.parse(data).data
  },

  create: async (row: DreamlensLedgerRequest) => {
    const { data } = await api.post('/dreamlens-ledger', toRequest(row))
    return ledgerRowSchema.parse(data).data
  },

  update: async (id: number, row: DreamlensLedgerRow | DreamlensLedgerRequest) => {
    const { data } = await api.put(`/dreamlens-ledger/${id}`, toRequest(row))
    return ledgerRowSchema.parse(data).data
  },

  remove: async (id: number) => {
    await api.delete(`/dreamlens-ledger/${id}`)
  },
}
