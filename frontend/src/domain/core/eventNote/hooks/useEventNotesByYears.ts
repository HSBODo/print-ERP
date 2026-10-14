import { useQueries } from '@tanstack/react-query'

import { eventNoteApi } from '../api'
import { toMonthLabels } from '../utils/monthLabels'
import { EVENT_NOTES_KEY } from './useEventNotes'

/**
 * 연도별 차트용 이벤트 노트 — 원본(상세 패널)과 월 레이블(차트 마커·툴팁)을 함께 준다.
 * 연도마다 1월 1일~12월 31일을 따로 조회한다
 * (한 번에 묶으면 4년 이상에서 API 최대 1,096일 제한에 걸린다).
 */
export function useEventNotesByYears(years: number[]) {
  return useQueries({
    queries: years.map((year) => ({
      queryKey: [...EVENT_NOTES_KEY, 'all', year],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        eventNoteApi.listAll(`${year}-01-01`, `${year}-12-31`, signal),
    })),
    combine: (results) => {
      const notes = results.flatMap((r) => r.data ?? [])
      return { notes, monthLabels: toMonthLabels(notes) }
    },
  })
}
