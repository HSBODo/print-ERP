import { CardDescription, CardHeader, CardTitle } from '#shared/ui/Card'

import type { ReservationOverallSeries } from '../../hooks/useReservationOverall'
import {
  RESERVATION_OVERALL_TABS,
  type ReservationOverallTab,
} from '../../utils/reservationOverallTabs'

interface Props {
  tab: ReservationOverallTab
  onTabChange: (tab: ReservationOverallTab) => void
  series: ReservationOverallSeries[]
}

/** 카드 머리 — 탭 제목·설명 · 종합/온라인/콜 탭 · 연도 범례 */
export function ReservationOverallHeader({ tab, onTabChange, series }: Props) {
  const current =
    RESERVATION_OVERALL_TABS.find((t) => t.key === tab) ??
    RESERVATION_OVERALL_TABS[0]

  return (
    <CardHeader className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle>{current.title}</CardTitle>
          <CardDescription>{current.description}</CardDescription>
        </div>
        <div className="flex flex-wrap gap-1 rounded-md bg-gray-100 p-1">
          {RESERVATION_OVERALL_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => onTabChange(t.key)}
              className={`h-8 rounded px-3 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
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
    </CardHeader>
  )
}
