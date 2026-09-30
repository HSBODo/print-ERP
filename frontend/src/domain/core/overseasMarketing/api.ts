import { api } from '#shared/api/client'

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
  getReceptions: async (
    params: OverseasMarketingReceptionParams,
    signal?: AbortSignal,
  ) => {
    const { data } = await api.get('/overseas-marketing/receptions', {
      params,
      signal,
    })
    return receptionsResponseSchema.parse(data).data
  },
  getStatistics: async (
    year: number,
    granularity: OverseasMarketingGranularity,
    signal?: AbortSignal,
  ) => {
    const { data } = await api.get('/overseas-marketing/statistics', {
      params: { year, granularity },
      signal,
    })
    return statisticsResponseSchema.parse(data).data
  },
  syncSheet: async () => {
    const { data } = await api.post('/overseas-marketing/sync-sheet', {})
    return syncResponseSchema.parse(data).data
  },
  syncCrm: async () => {
    const { data } = await api.post('/overseas-marketing/sync-crm', {})
    return crmSyncStatusResponseSchema.parse(data).data
  },
  getCrmSyncStatus: async () => {
    const { data } = await api.get('/overseas-marketing/sync-crm/status')
    return crmSyncStatusResponseSchema.parse(data).data
  },
  getReservationStats: async (
    year: number,
    granularity: OverseasMarketingGranularity,
    signal?: AbortSignal,
  ) => {
    const { data } = await api.get('/overseas-marketing/reservation-stats', {
      params: { year, granularity },
      signal,
    })
    return reservationStatsResponseSchema.parse(data).data
  },
  updateReservationStat: async (
    date: string,
    groupKey: string,
    metricKey: string,
    value: number,
  ) => {
    const { data } = await api.put(
      `/overseas-marketing/reservation-stats/${date}`,
      { groupKey, metricKey, value },
    )
    return reservationStatUpdateResponseSchema.parse(data).data
  },
  getCrmCustomer: async (customerNo: string) => {
    const { data } = await api.get(
      `/overseas-marketing/crm-customers/${encodeURIComponent(customerNo)}`,
    )
    return crmCustomerResponseSchema.parse(data).data
  },
  confirmMatch: async (rowNumber: number, customerNo: string) => {
    const { data } = await api.put(
      `/overseas-marketing/receptions/${rowNumber}/match`,
      { customerNo },
    )
    return matchConfirmResponseSchema.parse(data).data
  },
  getSyncAvailability: async (signal?: AbortSignal) => {
    const { data } = await api.get('/overseas-marketing/sync-availability', {
      signal,
    })
    return syncAvailabilityResponseSchema.parse(data).data.enabled
  },
  createReception: async (input: OverseasMarketingReceptionInput) => {
    const { data } = await api.post('/overseas-marketing/receptions', input)
    return mutationResponseSchema.parse(data).data
  },
  updateReception: async (
    rowNumber: number,
    input: OverseasMarketingReceptionInput,
  ) => {
    const { data } = await api.put(
      `/overseas-marketing/receptions/${rowNumber}`,
      input,
    )
    return mutationResponseSchema.parse(data).data
  },
  deleteReception: async (rowNumber: number) => {
    const { data } = await api.delete(
      `/overseas-marketing/receptions/${rowNumber}`,
    )
    return mutationResponseSchema.parse(data).data
  },
}
