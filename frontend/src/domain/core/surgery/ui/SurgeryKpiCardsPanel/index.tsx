import { useMemo } from 'react'

import { KpiCard } from '#shared/ui/KpiCard'
import { PanelShell } from '#shared/ui/PanelShell'
import { periodLabel } from '#shared/utils/stats'

import {
  EMPTY,
  GROUPS,
  gSum,
  SURGERY_KEYS,
  type SurgeryData,
} from '../../utils/surgeryGroups'

export function SurgeryKpiCardsPanel({
  dataMap,
  mode,
  periods,
  years,
  isLoading,
  isError,
}: {
  dataMap: Record<number, SurgeryData[]>
  mode: string
  periods: { year: number; month: number }[]
  years: number[]
  isLoading: boolean
  isError: boolean
}) {
  const periodsData = useMemo(
    () => periods.map((p) => dataMap[p.year]?.[p.month] ?? EMPTY),
    [periods, dataMap],
  )
  const yearTotals = useMemo(
    () =>
      years.map((year) => {
        const monthlyItems = dataMap[year] ?? []
        const result = { ...EMPTY }
        for (const item of monthlyItems) {
          for (const key of SURGERY_KEYS) {
            result[key] += item[key]
          }
          result.visionPatients += item.visionPatients
          result.cataractPatients += item.cataractPatients
          result.total += item.total
        }
        return result
      }),
    [years, dataMap],
  )

  const labels =
    mode === 'month' ? periods.map(periodLabel) : years.map((y) => `${y}년`)

  const renderCards = () => (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {GROUPS.map((g) => {
        const values =
          mode === 'month'
            ? periodsData.map((d) => gSum(d, g))
            : yearTotals.map((d) => gSum(d, g))
        return (
          <KpiCard
            key={g.key}
            label={g.label}
            values={values}
            labels={labels}
          />
        )
      })}
    </section>
  )

  return (
    <PanelShell isLoading={isLoading} isError={isError} variant="kpi">
      {renderCards()}
    </PanelShell>
  )
}
