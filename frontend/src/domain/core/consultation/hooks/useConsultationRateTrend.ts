import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { consultationApi } from '../api'
import type { ConsultationRateItem } from '../type/api'

interface MonthlyData {
  overallConsultation: number
  visionConsultation: number
  visionConsultationOneday: number
  visionConsultationGeneral: number
  visionGeneralBookRate: number
  visionSurgery: number
  cataractSurgery: number
  visionExamCount: number
  visionCounselCount: number
  visionSurgeryBooked: number
  cataractExamCount: number
  cataractSurgeryBooked: number
}

const EMPTY_RATES: MonthlyData = {
  overallConsultation: 0,
  visionConsultation: 0,
  visionConsultationOneday: 0,
  visionConsultationGeneral: 0,
  visionGeneralBookRate: 0,
  visionSurgery: 0,
  cataractSurgery: 0,
  visionExamCount: 0,
  visionCounselCount: 0,
  visionSurgeryBooked: 0,
  cataractExamCount: 0,
  cataractSurgeryBooked: 0,
}

const computeRate = (numerator: number, denominator: number) =>
  denominator > 0 ? Number(((numerator / denominator) * 100).toFixed(1)) : 0

function itemToData(item: ConsultationRateItem): MonthlyData {
  return {
    overallConsultation: computeRate(
      item.visionSurgeryBooked + item.cataractSurgeryBooked,
      item.visionExamCount + item.cataractExamCount,
    ),
    visionConsultation: item.visionCounselRate,
    visionConsultationOneday: item.visionCounselRateOneday ?? 0,
    visionConsultationGeneral: item.visionCounselRateGeneral ?? 0,
    visionGeneralBookRate: item.visionGeneralBookRate ?? 0,
    visionSurgery: item.visionSurgeryRate,
    cataractSurgery: item.cataractSurgeryRate,
    visionExamCount: item.visionExamCount,
    visionCounselCount: item.visionCounselCount,
    visionSurgeryBooked: item.visionSurgeryBooked,
    cataractExamCount: item.cataractExamCount,
    cataractSurgeryBooked: item.cataractSurgeryBooked,
  }
}

function toDataMap(
  items: ConsultationRateItem[],
): Record<number, MonthlyData[]> {
  const map: Record<number, MonthlyData[]> = {}
  for (const item of items) {
    if (!map[item.year])
      map[item.year] = Array.from({ length: 12 }, () => ({ ...EMPTY_RATES }))
    map[item.year][item.month - 1] = itemToData(item)
  }
  return map
}

export function useConsultationRateTrend(years: number[]) {
  const {
    data: apiItems,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['consultation-rate-trend', years],
    queryFn: ({ signal }) =>
      consultationApi.getConsultationRateTrend(years, signal),
    enabled: years.length > 0,
  })

  const dataMap = useMemo(
    () => (apiItems ? toDataMap(apiItems) : {}),
    [apiItems],
  )

  return {
    dataMap,
    isLoading,
    isError,
  }
}
