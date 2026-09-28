import { z } from 'zod'
import { api } from '#shared/api/client'
import { withQuery } from '#shared/api/utils'

/**
 * 고객분류별 검사수(월간 레포트 도표 #7) — 한 해의 (월 × 내원동기(레포트)) 건수.
 * 백엔드: GET /api/stats/exam-count/by-class?year → ApiResponse<List<{month,motiveReport,cnt}>>.
 * 세션(EXAM 행 + Cataract_Exam 행) 기준이라 월 합계가 '검사수' 도표(라이브 구간)와 일치한다.
 * 값이 0인 (월,분류) 조합은 행 자체가 없다 — 프론트에서 0으로 채운다.
 */
const examCountByClassRowSchema = z.object({
  month: z.number(),
  motiveReport: z.string(),
  cnt: z.number(),
})

export type ExamCountByClassRow = z.infer<typeof examCountByClassRowSchema>

const examCountByClassResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(examCountByClassRowSchema),
  message: z.string().nullish(),
})

export const examCountApi = {
  getExamCountByClass: async (year: number): Promise<ExamCountByClassRow[]> => {
    const res = await api.get<unknown>(withQuery('/stats/exam-count/by-class', { year }))
    return examCountByClassResponseSchema.parse(res).data
  },
}
