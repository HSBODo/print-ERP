import { Fragment } from 'react'

import { MONTHS } from '#shared/constants/chart'

import type { ChartMonthLabel, YearSeries } from '../type'

/** 툴팁 제목 — 월 + 그 달 이벤트(연도 색). 값이 없는 달에도 보인다. */
export function MonthWithEvents({
  month,
  annotations = [],
  series,
}: {
  month: string
  annotations?: ChartMonthLabel[]
  series: YearSeries[]
}) {
  const monthIndex = MONTHS.indexOf(month)
  const events = annotations
    .filter((a) => a.monthIndex === monthIndex)
    .sort((a, b) => a.year - b.year)

  return (
    <div>
      {month}
      {events.length > 0 && (
        <dl className="mt-1.5 grid max-w-72 grid-cols-[auto_1fr] gap-x-1.5 gap-y-0.5 border-t border-border pt-1.5 font-normal break-keep">
          {events.map(({ year, labels }) => (
            <Fragment key={year}>
              <dt
                className="font-semibold"
                style={{ color: series.find((s) => s.year === year)?.color }}
              >
                {year}
              </dt>
              <dd>
                {labels.map((label, i) => (
                  <div key={i}>{label}</div>
                ))}
              </dd>
            </Fragment>
          ))}
        </dl>
      )}
    </div>
  )
}
