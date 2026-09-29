import type { ReservationStatsResponseMeta } from '../type/api'

export const reservationStatsSourceLabel = (meta: ReservationStatsResponseMeta) => {
  if (meta.source === 'SNAPSHOT') return meta.locked ? 'PDF 고정' : '스냅샷'
  if (meta.source === 'MART') return '마트'
  if (meta.source === 'LIVE') return '라이브'
  return '미연결'
}
