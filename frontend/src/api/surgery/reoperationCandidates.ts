import { z } from 'zod'
import { api } from '#shared/api/client'
import { withQuery } from '#shared/api/utils'

/**
 * 재수술 후보 — RE_OPERATION 원본 행 + 자동판정(포함/제외)·제외사유.
 * 백엔드: GET /api/stats/surgery/reoperation-candidates?from&to → ApiResponse<List<Map>>.
 *
 * 이 API는 자동판정(포함/제외) 후보만 돌려주고, 담당자가 확정한 판정은 별도로 저장된다
 * (`reoperationDecision.ts` — reoperation_decision 테이블). 통계·리스트 화면은 두 소스를
 * ReoperationOverlay 로 합쳐 최종 재수술 여부를 결정한다.
 */
const reoperationCandidateSchema = z.object({
  chartNo: z.string(),
  name: z.string(),
  nameEng: z.string(),
  patientType: z.string(), // 신환/구환
  surgeon: z.string(), // 재수술 집도의
  payment: z.string(), // 재수술일 기준 수납금액(포맷된 문자열, 무료/0은 '')
  reopDate: z.string(),
  againR: z.string(),
  againL: z.string(),
  autoIncluded: z.number(), // 1: 자동 집계 포함, 0: 제외
  excludeReason: z.string(), // 제외 카테고리(포함 행은 '')
})

export type ReoperationCandidate = z.infer<typeof reoperationCandidateSchema>

const reoperationCandidatesResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(reoperationCandidateSchema),
  message: z.string().nullish(),
})

export const reoperationCandidatesApi = {
  getReoperationCandidates: async (from: string, to: string): Promise<ReoperationCandidate[]> => {
    const res = await api.get<unknown>(withQuery('/stats/surgery/reoperation-candidates', { from, to }))
    return reoperationCandidatesResponseSchema.parse(res).data
  },
}
