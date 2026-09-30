import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { outpatientApi } from '../api'
import type { OutpatientCountMonthlyItem } from '../type/api'

interface MonthlyData {
  outpatientCount: number | null
}

const EMPTY: MonthlyData = {
  outpatientCount: null,
}

function toDataMap(
  items: OutpatientCountMonthlyItem[],
): Record<number, MonthlyData[]> {
  const map: Record<number, MonthlyData[]> = {}
  for (const item of items) {
    if (!map[item.year])
      map[item.year] = Array.from({ length: 12 }, () => ({ ...EMPTY }))
    map[item.year][item.month - 1] = {
      outpatientCount: item.outpatientCount,
    }
  }
  return map
}

export function useOutpatientCountTrend(years: number[]) {
  const {
    data: apiData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['outpatient-count-trend', years],
    queryFn: ({ signal }) =>
      outpatientApi.getOutpatientCountMonthly(years, signal),
    enabled: years.length > 0,
  })

  const dataMap = useMemo(() => (apiData ? toDataMap(apiData) : {}), [apiData])

  return {
    dataMap,
    isLoading,
    isError,
  }
}
