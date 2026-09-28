import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { examApi } from '../api'
import type { ExaminationMonthlyItem } from '../type/api'

interface MonthlyData {
  visionCorrection: number
  dreamlens: number
  cataract: number
  examTotal: number
}

const EMPTY: MonthlyData = {
  visionCorrection: 0,
  dreamlens: 0,
  cataract: 0,
  examTotal: 0,
}

function toDataMap(items: ExaminationMonthlyItem[]): Record<number, MonthlyData[]> {
  const map: Record<number, MonthlyData[]> = {}
  for (const item of items) {
    if (!map[item.year]) map[item.year] = Array.from({ length: 12 }, () => ({ ...EMPTY }))
    const cataract = item.cataract ?? 0
    map[item.year][item.month - 1] = {
      visionCorrection: item.visionCorrection,
      dreamlens: item.dreamlens,
      cataract,
      examTotal: item.examTotal ?? item.visionCorrection + item.dreamlens + cataract,
    }
  }
  return map
}

export function useExaminationComposition(years: number[]) {
  const { data: apiData, isLoading, isError } = useQuery({
    queryKey: ['examination-composition', years],
    queryFn: () => examApi.getExaminationComposition(years),
    enabled: years.length > 0,
  })

  const dataMap = useMemo(() => (apiData ? toDataMap(apiData) : {}), [apiData])

  return {
    dataMap,
    isLoading,
    isError,
  }
}
