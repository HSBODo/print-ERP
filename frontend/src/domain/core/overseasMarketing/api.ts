import { api } from '#shared/api/client'
import { withQuery } from '#shared/api/utils'

import {
  type OverseasMarketingGranularity,
  type OverseasMarketingReceptionInput,
  type OverseasMarketingReceptionParams,
  receptionsResponseSchema,
  statisticsResponseSchema,
  syncResponseSchema,
  mutationResponseSchema,
  syncAvailabilityResponseSchema,
  crmSyncStatusResponseSchema,
  crmCustomerResponseSchema,
  matchConfirmResponseSchema,
  reservationStatsResponseSchema,
  reservationStatUpdateResponseSchema,
} from './type/api'

export const overseasMarketingApi = {
  getReceptions: async (params: OverseasMarketingReceptionParams) => {
    const response = await api.get<unknown>(withQuery('/overseas-marketing/receptions', {
      from: params.from,
      to: params.to,
      dateType: params.dateType,
      dateEnabled: params.dateEnabled,
      status: params.status,
      source: params.source,
      unmatched: params.unmatched,
    }))
    return receptionsResponseSchema.parse(response).data
  },
  getStatistics: async (year: number, granularity: OverseasMarketingGranularity) => {
    const response = await api.get<unknown>(withQuery('/overseas-marketing/statistics', { year, granularity }))
    return statisticsResponseSchema.parse(response).data
  },
  syncSheet: async () => {
    const response = await api.post<unknown>('/overseas-marketing/sync-sheet', {})
    return syncResponseSchema.parse(response).data
  },
  syncCrm: async () => {
    const response = await api.post<unknown>('/overseas-marketing/sync-crm', {})
    return crmSyncStatusResponseSchema.parse(response).data
  },
  getCrmSyncStatus: async () => {
    const response = await api.get<unknown>('/overseas-marketing/sync-crm/status')
    return crmSyncStatusResponseSchema.parse(response).data
  },
  getReservationStats: async (year: number, granularity: OverseasMarketingGranularity) => {
    const response = await api.get<unknown>(withQuery('/overseas-marketing/reservation-stats', { year, granularity }))
    return reservationStatsResponseSchema.parse(response).data
  },
  updateReservationStat: async (date: string, groupKey: string, metricKey: string, value: number) => {
    const response = await api.put<unknown>(`/overseas-marketing/reservation-stats/${date}`, { groupKey, metricKey, value })
    return reservationStatUpdateResponseSchema.parse(response).data
  },
  getCrmCustomer: async (customerNo: string) => {
    const response = await api.get<unknown>(`/overseas-marketing/crm-customers/${encodeURIComponent(customerNo)}`)
    return crmCustomerResponseSchema.parse(response).data
  },
  confirmMatch: async (rowNumber: number, customerNo: string) => {
    const response = await api.put<unknown>(`/overseas-marketing/receptions/${rowNumber}/match`, { customerNo })
    return matchConfirmResponseSchema.parse(response).data
  },
  getSyncAvailability: async () => {
    const response = await api.get<unknown>('/overseas-marketing/sync-availability')
    return syncAvailabilityResponseSchema.parse(response).data.enabled
  },
  createReception: async (input: OverseasMarketingReceptionInput) => {
    const response = await api.post<unknown>('/overseas-marketing/receptions', input)
    return mutationResponseSchema.parse(response).data
  },
  updateReception: async (rowNumber: number, input: OverseasMarketingReceptionInput) => {
    const response = await api.put<unknown>(`/overseas-marketing/receptions/${rowNumber}`, input)
    return mutationResponseSchema.parse(response).data
  },
  deleteReception: async (rowNumber: number) => {
    const response = await api.delete<unknown>(`/overseas-marketing/receptions/${rowNumber}`)
    return mutationResponseSchema.parse(response).data
  },
}
