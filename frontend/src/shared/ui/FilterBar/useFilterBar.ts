import { type Dispatch, type SetStateAction, useState } from 'react'

import {
  type CompareMode,
  getDefaultPeriods,
  getDefaultYears,
  type Period,
} from '#shared/utils/stats'

export interface FilterBarControls {
  mode: CompareMode
  setMode: Dispatch<SetStateAction<CompareMode>>
  periods: Period[]
  setPeriods: Dispatch<SetStateAction<Period[]>>
  years: number[]
  setYears: Dispatch<SetStateAction<number[]>>
  removePeriod: (index: number) => void
}

export function useFilterBar(
  initialMode: CompareMode = 'month',
  initialYears?: number[],
): FilterBarControls {
  const [mode, setMode] = useState<CompareMode>(initialMode)
  const [periods, setPeriods] = useState<Period[]>(() => getDefaultPeriods())
  const [years, setYears] = useState<number[]>(
    () => initialYears ?? getDefaultYears(),
  )

  const removePeriod = (index: number) => {
    if (mode === 'month' && periods.length > 1) {
      setPeriods(periods.filter((_, currentIndex) => currentIndex !== index))
    }

    if (mode === 'year' && years.length > 1) {
      setYears(years.filter((_, currentIndex) => currentIndex !== index))
    }
  }

  return { mode, setMode, periods, setPeriods, years, setYears, removePeriod }
}
