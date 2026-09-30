import { z } from 'zod'
import { apiResponseOf } from '#shared/api/utils'

/* ── Monthly (B2B 매출 페이지용) ── */

const b2bRevenueMonthlyItemSchema = z.object({
  year: z.number(),
  month: z.number(),
  totalRevenue: z.number(),
  caseCount: z.number(),
  avgRevenuePerCase: z.number(),
  visionRevenue: z.number(),
  cataractRevenue: z.number(),
  visionCount: z.number(),
  cataractCount: z.number(),
  designatedRevenue: z.number(),
  nonDesignatedRevenue: z.number(),
  designatedCount: z.number(),
  nonDesignatedCount: z.number(),
  opCost: z.number(),
  examCost: z.number(),
  dnaCost: z.number(),
  prpCost: z.number(),
  etcCost: z.number(),
  presbyopiaCost: z.number(),
  hospitalSupplyCost: z.number(),
})
export type B2bRevenueMonthlyItem = z.infer<typeof b2bRevenueMonthlyItemSchema>
export const b2bRevenueResponseSchema = apiResponseOf(
  z.array(b2bRevenueMonthlyItemSchema),
)
