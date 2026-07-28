import { z } from 'zod'
import { api } from '@/api/client'
import { withQuery } from '@/api/_shared'

/**
 * 검사수(월간 레포트 c-exam-count 기준) 범위 집계 — EXAM 행수 + Cataract_Exam 세션수.
 * 백엔드: GET /api/stats/exam-count?from&to → ApiResponse<{ visionCount, cataractCount }>.
 * 전체 검사자 리스트의 "조회건수(사람)" 옆 참고 지표.
 */
const examCountSchema = z.object({
  visionCount: z.number(), // EXAM 행수(시력교정+드림렌즈)
  cataractCount: z.number(), // Cataract_Exam 세션수(백내장)
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
