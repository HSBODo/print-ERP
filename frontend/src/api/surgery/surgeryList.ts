import { z } from 'zod'
import { api } from '#shared/api/client'
import { withQuery } from '#shared/api/utils'

/**
 * 수술자 리스트 — 기준일은 수술일자, 보조일은 검사일자.
 * 백엔드: GET /api/surgery-list?from&to → ApiResponse<List<Map>>.
 */
const surgeryListItemSchema = z.object({
  chartNo: z.string(),
  name: z.string(),
  nameEng: z.string(),
  surgeryCategory: z.string(),
  surgeryDate: z.string(),
  examDate: z.string(),
  patientType: z.string(),
  surgeryReserveDate: z.string(),
  surgeryRegDate: z.string(),
  surgeryTime: z.string(),
  surgeryR: z.string(),
  surgeryL: z.string(),
  recommendedR: z.string(),
  recommendedL: z.string(),
  estimate: z.string(),
  surgeryRate: z.string(),
  payment: z.string(),
  surgeon: z.string(),
  counselor: z.string(),
  doctor: z.string(),
  optometrist: z.string(),
  birth: z.string(),
  lunar: z.string(),
  phone1: z.string(),
  phone2: z.string(),
  email: z.string(),
  zip: z.string(),
  addr1: z.string(),
  addr2: z.string(),
  memo: z.string(),
  grade: z.string(),
  job: z.string(),
  lastVisit: z.string(),
  route: z.string(),
  section: z.string(),
  motiveL: z.string(),
  motiveM: z.string(),
  motiveS: z.string(),
  motiveMemo: z.string(),
  examMemo: z.string(),
  insurance: z.string(),
  nationality: z.string(),
})

export type SurgeryListItem = z.infer<typeof surgeryListItemSchema>

const surgeryListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(surgeryListItemSchema),
  message: z.string().nullish(),
})

export const surgeryListApi = {
  getSurgeryList: async (from: string, to: string): Promise<SurgeryListItem[]> => {
    const res = await api.get<unknown>(withQuery('/surgery-list', { from, to }))
    return surgeryListResponseSchema.parse(res).data
  },
}
