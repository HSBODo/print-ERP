import { MONTHS } from '#shared/constants/chart'

import type { EventNote } from '../../type/api'
import { EventNoteYearSection } from './EventNoteYearSection'
import { groupMonthNotesByYear } from './groupByYear'

interface Props {
  /** 차트에 걸린 연도 전체 노트 — 그중 monthIndex 달만 보여 준다 */
  notes: EventNote[]
  /** 0 = 1월 · 없으면 안내 문구 */
  monthIndex?: number
  /** 연도 → 차트 선 색 */
  yearColors: Record<number, string>
}

/**
 * 차트 옆 이벤트 상세 — 가리킨 달의 노트를 연도별로 묶어 요약·기간·설명까지 보여 준다.
 * 높이는 옆 열(차트·표)을 따라가고 넘치는 노트는 안에서 스크롤한다 — 노트가 많아도 행을 늘리지 않게.
 */
export function EventNoteDetailPanel({ notes, monthIndex, yearColors }: Props) {
  const groups = groupMonthNotesByYear(notes, monthIndex)
  const title =
    monthIndex === undefined ? '이벤트' : `${MONTHS[monthIndex]} 이벤트`
  const emptyMessage =
    monthIndex === undefined
      ? '차트에서 월을 가리키면 그 달의 이벤트가 보여요.'
      : '이 달에는 이벤트가 없습니다.'

  return (
    <div className="relative w-72 shrink-0">
      <aside className="absolute inset-0 flex flex-col rounded-lg border border-border/70 bg-gray-50/60">
        <h3 className="border-b border-border/70 px-4 py-3 text-sm font-semibold text-gray-900">
          {title}
        </h3>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3 text-sm">
          {groups.length === 0 && (
            <p className="text-gray-400">{emptyMessage}</p>
          )}
          {groups.map((group) => (
            <EventNoteYearSection
              key={group.year}
              group={group}
              color={yearColors[group.year]}
            />
          ))}
        </div>
      </aside>
    </div>
  )
}
