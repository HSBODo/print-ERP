import { z } from 'zod'
import { api } from '@/api/client'
import { withQuery } from '@/api/_shared'

/**
 * 누적 안수 리스트 — 원천 OPERATION_ACCUMULATED_EYE_COUNT 를 마트({@code list_accumulated_eyes})에서 조회.
 * 백엔드: GET /api/accumulated-eyes?from&to&query → ApiResponse<List<AccumulatedEyeRow>>.
 *
 * 한 사람 양안이면 R/L 각 1행으로 온다(눈 단위). accumulatedEyeCount 는 그 눈이 몇 번째 안수인지.
 */
const accumulatedEyeItemSchema = z.object({
  id: z.string(),
  custNum: z.string(),
  customName: z.string(),
  customPhone: z.string(),
  operationCategory: z.string(),
  operationCode: z.string(),
  operationDate: z.string(),           // YYYY-MM-DD
  accumulatedEyeCount: z.number(),
  eyePosition: z.string(),             // 'R' | 'L' | ''
  createDate: z.string().nullish(),
  lastModifiedDate: z.string().nullish(),
})

export type AccumulatedEyeItem = z.infer<typeof accumulatedEyeItemSchema>

const accumulatedEyeResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(accumulatedEyeItemSchema),
  message: z.string().nullish(),
})

/** 검색 대상 필드 — 백엔드 SQL 의 :field 파라미터와 값이 일치해야 한다. */
export type AccumulatedEyesField = 'all' | 'name' | 'chart' | 'phone' | 'eyes'

export const accumulatedEyesApi = {
  getAccumulatedEyes: async (
    from: string,
    to: string,
    query: string,
    field: AccumulatedEyesField = 'all',
  ): Promise<AccumulatedEyeItem[]> => {
    const res = await api.get<unknown>(
      withQuery('/accumulated-eyes', { from, to, query, field }),
    )
    return accumulatedEyeResponseSchema.parse(res).data
  },
}
