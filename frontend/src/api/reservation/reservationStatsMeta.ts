import { z } from 'zod'

export const reservationStatsResponseMetaSchema = z.object({
  source: z.enum(['SNAPSHOT', 'LIVE', 'MART', 'UNAVAILABLE']),
  period: z.string(),
  schemaVersion: z.number().optional(),
  formulaVersion: z.string().optional(),
  locked: z.boolean().optional(),
  confirmedAt: z.string().optional(),
  confirmedBy: z.string().optional(),
})

export type ReservationStatsResponseMeta = z.infer<typeof reservationStatsResponseMetaSchema>

export const reservationStatsSourceLabel = (meta: ReservationStatsResponseMeta) => {
  if (meta.source === 'SNAPSHOT') return meta.locked ? 'PDF 고정' : '스냅샷'
  if (meta.source === 'MART') return '마트'
  if (meta.source === 'LIVE') return '라이브'
  return '미연결'
}
