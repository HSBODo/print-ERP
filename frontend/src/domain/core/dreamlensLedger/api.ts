import { api } from '#shared/api/client'
import { withQuery } from '#shared/api/utils'

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
  list: async (from: string, to: string) =>
    ledgerListSchema.parse(await api.get<unknown>(withQuery('/dreamlens-ledger', { from, to }))).data,

  create: async (row: DreamlensLedgerRequest) =>
    ledgerRowSchema.parse(await api.post<unknown>('/dreamlens-ledger', toRequest(row))).data,

  update: async (id: number, row: DreamlensLedgerRow | DreamlensLedgerRequest) =>
    ledgerRowSchema.parse(await api.put<unknown>(`/dreamlens-ledger/${id}`, toRequest(row))).data,

  remove: async (id: number) => {
    await api.delete<unknown>(`/dreamlens-ledger/${id}`)
  },
}
