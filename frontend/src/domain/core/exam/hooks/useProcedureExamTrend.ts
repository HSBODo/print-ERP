import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { examApi } from '../api'
import type { ProcedureExamMonthlyItem } from '../type/api'

interface MonthlyData {
  examCount: number
  oneDayExamCount: number
}

const EMPTY: MonthlyData = {
  examCount: 0,
  oneDayExamCount: 0,
}

function toDataMap(items: ProcedureExamMonthlyItem[]): Record<number, MonthlyData[]> {
  const map: Record<number, MonthlyData[]> = {}
  for (const item of items) {
    if (!map[item.year]) map[item.year] = Array.from({ length: 12 }, () => ({ ...EMPTY }))
    map[item.year][item.month - 1] = {
      examCount: item.examCount,
      oneDayExamCount: item.oneDayExamCount,
    }
  }
  return map
}

export function useProcedureExamTrend(years: number[]) {
  const { data: apiData, isLoading, isError } = useQuery({
    queryKey: ['procedure-exam-trend', years],
    queryFn: ({ signal }) => examApi.getProcedureExamMonthly(years, signal),
    enabled: years.length > 0,
  })

  const dataMap = useMemo(() => (apiData ? toDataMap(apiData) : {}), [apiData])

  return {
    dataMap,
    isLoading,
    isError,
  }
}
