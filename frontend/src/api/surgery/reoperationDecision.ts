import { z } from 'zod'
import { api } from '@/api/client'
import { withQuery } from '@/api/_shared'

/**
 * 재수술 검토 판정 저장·조회 — (차트번호, 수술일) 유니크로 upsert.
 * 저장이 없는 조합은 "미검토" 상태라 자동판정을 그대로 쓴다.
 */
const reoperationDecisionRowSchema = z.object({
  id: z.number(),
  chartNo: z.string(),
  opDate: z.string(),
  againR: z.string(),
  againL: z.string(),
  isReoperation: z.boolean(),
  memo: z.string().nullish(),
  updatedAt: z.string().nullish(),
  updatedBy: z.string().nullish(),
})

export type ReoperationDecisionRow = z.infer<typeof reoperationDecisionRowSchema>

const listResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(reoperationDecisionRowSchema),
  message: z.string().nullish(),
})

const saveResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(reoperationDecisionRowSchema),
  message: z.string().nullish(),
})

export interface ReoperationDecisionSaveItem {
  chartNo: string
  opDate: string
  againR: string
  againL: string
  isReoperation: boolean
  memo?: string
}

export const reoperationDecisionApi = {
  list: async (from: string, to: string): Promise<ReoperationDecisionRow[]> => {
    const res = await api.get<unknown>(withQuery('/reoperation-decisions', { from, to }))
    return listResponseSchema.parse(res).data
  },

  saveBatch: async (decisions: ReoperationDecisionSaveItem[]): Promise<ReoperationDecisionRow[]> => {
    const res = await api.put<unknown>('/reoperation-decisions', { decisions })
    return saveResponseSchema.parse(res).data
  },
}
