import { z } from 'zod'
import { api } from '@/api/client'
import { apiResponseOf, withQuery } from '@/api/_shared'

/* ── Monthly (수술 건수 페이지용) ── */

const surgeryMonthlyItemSchema = z.object({
  year: z.number(), month: z.number(),
  lasek: z.number(), lasik: z.number(), smile: z.number(), smilePro: z.number(),
  icl: z.number(), tIcl: z.number(), kpl: z.number(), tKpl: z.number(), viva: z.number(),
  // presbyond: 노안 레이저 / piolPatients: PIOL DISTINCT 환자 수(유형별 합산 아님).
  // 마트 재적재 전 옛 응답과의 호환을 위해 optional.
  presbyond: z.number().optional(), piolPatients: z.number().optional(),
  catMulti: z.number(), catMono: z.number(), catEdof: z.number(),
  xtra: z.number().optional(), waveVision: z.number().optional(), monoVision: z.number().optional(),
  contra: z.number().optional(), personal: z.number().optional(),
  lasekEx: z.number().optional(), lasekRed: z.number().optional(),
  reoperation: z.number().optional(), reopLaser: z.number().optional(), reopLens: z.number().optional(),
  visionPatients: z.number().optional(), cataractPatients: z.number().optional(),
  total: z.number(),
})
export type SurgeryMonthlyItem = z.infer<typeof surgeryMonthlyItemSchema>
const surgeryMonthlyResponseSchema = apiResponseOf(z.array(surgeryMonthlyItemSchema))

/* ── Daily (수술별 비중 일별 모드용) ── */

const surgeryDailyItemSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  lasek: z.number(), lasik: z.number(), smile: z.number(), smilePro: z.number(),
  icl: z.number(), tIcl: z.number(), kpl: z.number(), tKpl: z.number(), viva: z.number(),
  // presbyond: 노안 레이저 / piolPatients: PIOL DISTINCT 환자 수(유형별 합산 아님).
  // 마트 재적재 전 옛 응답과의 호환을 위해 optional.
  presbyond: z.number().optional(), piolPatients: z.number().optional(),
  catMulti: z.number(), catMono: z.number(), catEdof: z.number(),
  xtra: z.number().optional(), waveVision: z.number().optional(), monoVision: z.number().optional(),
  contra: z.number().optional(), personal: z.number().optional(),
  lasekEx: z.number().optional(), lasekRed: z.number().optional(),
  reoperation: z.number().optional(), reopLaser: z.number().optional(), reopLens: z.number().optional(),
  visionPatients: z.number().optional(), cataractPatients: z.number().optional(),
  total: z.number(),
})
export type SurgeryDailyItem = z.infer<typeof surgeryDailyItemSchema>

/** 응답 메타 — 출처(마트/라이브) 표시용. NON_NULL이라 대부분 optional. */
const surgeryDailyMetaSchema = z.object({
  source: z.enum(['LIVE', 'MART', 'UNAVAILABLE']).optional(),
  period: z.string().optional(),
}).optional()
export type SurgeryDailyMeta = z.infer<typeof surgeryDailyMetaSchema>
const surgeryDailyResponseSchema = apiResponseOf(z.array(surgeryDailyItemSchema), surgeryDailyMetaSchema)

export const surgeryApi = {
  getSurgeryMonthly: async (years: number[]) =>
    surgeryMonthlyResponseSchema.parse(await api.get<unknown>(withQuery('/stats/surgery/monthly', { years }))).data,

  getSurgeryRatio: async (years: number[]) =>
    surgeryMonthlyResponseSchema.parse(await api.get<unknown>(withQuery('/stats/surgery-ratio', { years }))).data,

  getSurgeryKpi: async (years: number[]) =>
    surgeryMonthlyResponseSchema.parse(await api.get<unknown>(withQuery('/stats/surgery/kpi', { years }))).data,

  getSurgeryTrend: async (years: number[]) =>
    surgeryMonthlyResponseSchema.parse(await api.get<unknown>(withQuery('/stats/surgery/panel/trend', { years }))).data,

  getSurgeryComposition: async (years: number[]) =>
    surgeryMonthlyResponseSchema.parse(await api.get<unknown>(withQuery('/stats/surgery/panel/composition', { years }))).data,

  /** 수술별 비중 일별 — mart_surgery_daily 조회(postgres-mart) 또는 소스 라이브(mssql). data+meta 반환. */
  getSurgeryDaily: async (from: string, to: string) => {
    const res = surgeryDailyResponseSchema.parse(await api.get<unknown>(withQuery('/stats/surgery/daily', { from, to })))
    return { data: res.data, meta: res.meta }
  },
}
