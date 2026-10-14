import type { YearSeries } from '../type'

/** 연도 범례 — 최신 연도만 선 색 글자 */
export function Legend({ series }: { series: YearSeries[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      {series.map((s) => (
        <span
          key={s.year}
          className="flex items-center gap-2 text-sm font-bold"
          style={{ color: s.isLatest ? s.color : '#374151' }}
        >
          <span
            className="h-[3px] w-8 rounded-full"
            style={{ backgroundColor: s.color }}
          />
          {s.year}
        </span>
      ))}
    </div>
  )
}
