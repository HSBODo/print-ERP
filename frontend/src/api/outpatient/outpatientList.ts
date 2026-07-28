import { z } from 'zod'
import { api } from '@/api/client'
import { withQuery } from '@/api/_shared'

/**
 * 외래수 리스트 — RESERVATION 기준 외래(F) + 내원/퇴원(I/H) 행 목록.
 * 백엔드: GET /api/outpatient-list?from&to → ApiResponse<List<Map>> (camelCase 키).
 * 행 1개 = RESERVE_NUM 1개. 리스트 합계 = 월별 외래수 지표(outpatient-count)와 정합.
 * 전 컬럼 문자열.
 */
const outpatientListItemSchema = z.object({
  reserveNum: z.string(),
  reserveDate: z.string(),
  reserveTime: z.string(),
  endTime: z.string(),
  state: z.string(),           // '내원' | '퇴원'
  stateCode: z.string(),       // 'I' | 'H'
  reserveType: z.string(),     // 진료 세부유형 (MEDICAL_SUB_CFG.SUB_NAME)
  reserveJinryoCode: z.string(),
  patientType: z.string(),     // '신환' | '구환'
  oldFlag: z.string(),
  todayFlag: z.string(),
  happyCall: z.string(),
  chartNo: z.string(),
  name: z.string(),
  nameEng: z.string(),
  grade: z.string(),
  birth: z.string(),
  lunar: z.string(),
  phone1: z.string(),
  phone2: z.string(),
  email: z.string(),
  zip: z.string(),
  addr1: z.string(),
  addr2: z.string(),
  doctor: z.string(),
  counselor: z.string(),
  registeredBy: z.string(),
  comment: z.string(),
  route: z.string(),
  section: z.string(),
  motiveL: z.string(),
  motiveM: z.string(),
  motiveS: z.string(),
  motiveMemo: z.string(),
  job: z.string(),
  lastVisit: z.string(),
  insurance: z.string(),
  nationality: z.string(),
  memo: z.string(),
})

export type OutpatientListItem = z.infer<typeof outpatientListItemSchema>

const outpatientListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(outpatientListItemSchema),
  message: z.string().nullish(),
})

export const outpatientListApi = {
  getOutpatientList: async (from: string, to: string): Promise<OutpatientListItem[]> => {
    const res = await api.get<unknown>(withQuery('/outpatient-list', { from, to }))
    return outpatientListResponseSchema.parse(res).data
  },
}
