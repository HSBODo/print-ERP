import { MONTHS } from '#shared/constants/chart'

import { formatValue, summarize, SUMMARY_LABEL } from '../format'
import type { YearCompareFormat, YearCompareRow, YearSeries } from '../type'

interface Props {
  chartData: YearCompareRow[]
  series: YearSeries[]
  format: YearCompareFormat
}

/** 차트 아래 월별 표 — 연도별 행 + 합계(건수) 또는 평균(비율) */
export function Table({ chartData, series, format }: Props) {
  const show = (value: number | null) =>
    value === null ? '' : formatValue(format, value)

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
            <th className="py-2 font-semibold text-foreground">
              {SUMMARY_LABEL[format]}
            </th>
          </tr>
        </thead>
        <tbody>
          {series.map((s) => {
            const values = chartData.map((row) => {
              const value = row[s.key]
              return typeof value === 'number' ? value : null
            })
            const summary = summarize(
              format,
              values.filter((value) => value !== null),
            )

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
                {values.map((value, monthIndex) => (
                  <td key={MONTHS[monthIndex]} className="py-2 tabular-nums">
                    {show(value)}
                  </td>
                ))}
                <td className="py-2 font-semibold tabular-nums">
                  {show(summary)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
