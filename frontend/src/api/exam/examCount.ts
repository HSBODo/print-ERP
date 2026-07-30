import { z } from 'zod'
import { api } from '@/api/client'
import { withQuery } from '@/api/_shared'

/**
 * 검사수 범위 집계 — 마트(list_exam + list_cataract_exam) 원시 COUNT.
 * 백엔드: GET /api/stats/exam-count?from&to → ApiResponse<{ visionCount, cataractCount }>.
 * 전체 검사자 리스트의 "조회건수(사람)" 옆 참고 지표.
 */
const examCountSchema = z.object({
  visionCount: z.number(), // list_exam 행수(시력교정+드림렌즈)
  cataractCount: z.number(), // list_cataract_exam 행수(백내장, 사람·검사일 단위)
})

export type ExamCount = z.infer<typeof examCountSchema>

const examCountResponseSchema = z.object({
  success: z.boolean(),
  data: examCountSchema,
  message: z.string().nullish(),
})

export const examCountApi = {
  getExamCount: async (from: string, to: string): Promise<ExamCount> => {
    const res = await api.get<unknown>(withQuery('/stats/exam-count', { from, to }))
    return examCountResponseSchema.parse(res).data
  },
}
