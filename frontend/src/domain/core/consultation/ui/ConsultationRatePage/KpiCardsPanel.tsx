import { useMemo } from 'react'

import { KpiCard } from '#shared/ui/KpiCard'
import { PanelShell } from '#shared/ui/PanelShell'
import { periodLabel } from '#shared/utils/stats'

import {
  computeRate,
  EMPTY,
  formatRate,
  METRICS,
  type MonthlyData,
} from './consultationRateUtils'

interface KpiCardsPanelProps {
  dataMap: Record<number, MonthlyData[]>
  mode: string
  periods: { year: number; month: number }[]
  years: number[]
  isLoading: boolean
  isError: boolean
}

export function KpiCardsPanel({
  dataMap,
  mode,
  periods,
  years,
  isLoading,
  isError,
}: KpiCardsPanelProps) {
  const periodsData = useMemo(
    () => periods.map((p) => dataMap[p.year]?.[p.month] ?? EMPTY),
    [periods, dataMap],
  )

  const yearAverages = useMemo<MonthlyData[]>(
    () =>
      years.map((year) => {
        const months = dataMap[year] ?? []
        const sums = months.reduce(
          (acc, m) => ({
            visionExamCount: acc.visionExamCount + m.visionExamCount,
            visionCounselCount: acc.visionCounselCount + m.visionCounselCount,
            visionSurgeryBooked:
              acc.visionSurgeryBooked + m.visionSurgeryBooked,
            cataractExamCount: acc.cataractExamCount + m.cataractExamCount,
            cataractSurgeryBooked:
              acc.cataractSurgeryBooked + m.cataractSurgeryBooked,
          }),
          {
            visionExamCount: 0,
            visionCounselCount: 0,
            visionSurgeryBooked: 0,
            cataractExamCount: 0,
            cataractSurgeryBooked: 0,
          },
        )

        return {
          ...sums,
          overallConsultation: computeRate(
            sums.visionSurgeryBooked + sums.cataractSurgeryBooked,
            sums.visionExamCount + sums.cataractExamCount,
          ),
          visionConsultation: computeRate(
            sums.visionCounselCount,
            sums.visionExamCount,
          ),
          visionSurgery: computeRate(
            sums.visionSurgeryBooked,
            sums.visionExamCount,
          ),
          cataractSurgery: computeRate(
            sums.cataractSurgeryBooked,
            sums.cataractExamCount,
          ),
        }
      }),
    [years, dataMap],
  )

  const renderCards = () => (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {METRICS.map((metric) => {
        const values =
          mode === 'month'
            ? periodsData.map((data) => data[metric.key])
            : yearAverages.map((data) => data[metric.key])
        const labels =
          mode === 'month'
            ? periods.map(periodLabel)
            : years.map((year) => `${year}년`)

        return (
          <KpiCard
            key={metric.key}
            label={metric.label}
            values={values}
            labels={labels}
            formatValue={formatRate}
            changeUnit="%p"
            changeMode="point"
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
