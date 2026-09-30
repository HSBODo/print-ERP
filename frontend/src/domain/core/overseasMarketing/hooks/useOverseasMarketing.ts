import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { overseasMarketingApi } from '../api'
import type {
  OverseasMarketingGranularity,
  OverseasMarketingReceptionInput,
  OverseasMarketingReceptionParams,
} from '../type/api'

export function useOverseasMarketingReceptions(
  params: OverseasMarketingReceptionParams,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['overseas-marketing', 'receptions', params],
    queryFn: ({ signal }) => overseasMarketingApi.getReceptions(params, signal),
    enabled,
  })
}

export function useOverseasMarketingStatistics(
  year: number,
  granularity: OverseasMarketingGranularity,
  enabled = true,
) {
  return useQuery({
    queryKey: ['overseas-marketing', 'statistics', year, granularity],
    queryFn: ({ signal }) =>
      overseasMarketingApi.getStatistics(year, granularity, signal),
    enabled,
  })
}

export function useOverseasMarketingSheetSync() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: overseasMarketingApi.syncSheet,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['overseas-marketing'] }),
  })
}

export function useOverseasMarketingCrmSync() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: overseasMarketingApi.syncCrm,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['overseas-marketing'] }),
  })
}

export function useOverseasReservationStats(
  year: number,
  granularity: OverseasMarketingGranularity,
) {
  return useQuery({
    queryKey: ['overseas-marketing', 'reservation-stats', year, granularity],
    queryFn: ({ signal }) =>
      overseasMarketingApi.getReservationStats(year, granularity, signal),
  })
}

export function useOverseasReservationStatUpdate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      date,
      groupKey,
      metricKey,
      value,
    }: {
      date: string
      groupKey: string
      metricKey: string
      value: number
    }) =>
      overseasMarketingApi.updateReservationStat(
        date,
        groupKey,
        metricKey,
        value,
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['overseas-marketing', 'reservation-stats'],
      }),
  })
}

export function useOverseasMarketingMatchConfirm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      rowNumber,
      customerNo,
    }: {
      rowNumber: number
      customerNo: string
    }) => overseasMarketingApi.confirmMatch(rowNumber, customerNo),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['overseas-marketing'] }),
  })
}

export function useOverseasMarketingSyncAvailability() {
  return useQuery({
    queryKey: ['overseas-marketing', 'sync-availability'],
    queryFn: ({ signal }) => overseasMarketingApi.getSyncAvailability(signal),
    staleTime: Infinity,
  })
}

export function useOverseasMarketingReceptionCreate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: OverseasMarketingReceptionInput) =>
      overseasMarketingApi.createReception(input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['overseas-marketing', 'receptions'],
      }),
  })
}

export function useOverseasMarketingReceptionUpdate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      rowNumber,
      input,
    }: {
      rowNumber: number
      input: OverseasMarketingReceptionInput
    }) => overseasMarketingApi.updateReception(rowNumber, input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['overseas-marketing', 'receptions'],
      }),
  })
}

export function useOverseasMarketingReceptionDelete() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (rowNumber: number) =>
      overseasMarketingApi.deleteReception(rowNumber),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ['overseas-marketing', 'receptions'],
      }),
  })
}
