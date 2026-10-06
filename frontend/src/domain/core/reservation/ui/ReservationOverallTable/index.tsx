import { MONTHS } from '#shared/constants/chart'
import { formatAxisNumber } from '#shared/utils/stats'

import type {
  ReservationOverallRow,
  ReservationOverallSeries,
} from '../../hooks/useReservationOverall'

interface Props {
  chartData: ReservationOverallRow[]
  series: ReservationOverallSeries[]
}

/** 차트 아래 월별 표 — 연도별 행 + 합계 */
export function ReservationOverallTable({ chartData, series }: Props) {
  return (
    <div className="shrink-0 overflow-x-auto">
      <table className="w-full min-w-[840px] table-fixed border-collapse text-center text-sm">
        <colgroup>
          <col className="w-20" />
          {MONTHS.map((month) => (
            <col key={month} />
          ))}
          <col className="w-20" />
        </colgroup>
        <thead>
          <tr className="border-y border-border bg-muted/40">
            <th className="py-2" />
            {MONTHS.map((month) => (
              <th key={month} className="py-2 font-semibold text-foreground">
                {month}
              </th>
            ))}
            <th className="py-2 font-semibold text-foreground">합계</th>
          </tr>
        </thead>
        <tbody>
          {series.map((s) => {
            const total = chartData.reduce((sum, row) => {
              const value = row[s.key]
              return typeof value === 'number' ? sum + value : sum
            }, 0)

            return (
              <tr key={s.year} className="border-b border-border">
                <td className="py-2">
                  <span
                    className="flex items-center justify-center gap-1.5 font-semibold"
                    style={{ color: s.isLatest ? s.color : undefined }}
                  >
                    <span
                      className="h-[3px] w-5 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.year}
                  </span>
                </td>
                {MONTHS.map((_, monthIndex) => {
                  const value = chartData[monthIndex][s.key]
                  return (
                    <td key={monthIndex} className="py-2 tabular-nums">
                      {typeof value === 'number' ? formatAxisNumber(value) : ''}
                    </td>
                  )
                })}
                <td className="py-2 font-semibold tabular-nums">
                  {total > 0 ? formatAxisNumber(total) : ''}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
