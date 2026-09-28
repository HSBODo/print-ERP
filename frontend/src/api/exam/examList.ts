import { z } from 'zod'
import { api } from '#shared/api/client'
import { withQuery } from '#shared/api/utils'

/**
 * 검사자 리스트(상담사별) — 성민CRM 화면 소스(EXAM+CUSTOM+OPERATIONDATA+EMPLOYEE)의 행 목록.
 * 검사정보1~30(측정값)을 제외한 비측정 47컬럼. 전 컬럼 문자열(견적가도 텍스트).
 * 백엔드: GET /api/exam-list?from&to → ApiResponse<List<Map>> (camelCase 키).
 */
const examListItemSchema = z.object({
  chartNo: z.string(),
  name: z.string(),
  nameEng: z.string(),
  examDate: z.string(),
  examType: z.string(),
  examCategory: z.string(),
  patientType: z.string(),
  examRegDate: z.string(),
  examMemo: z.string(),
  estimate: z.string(),
  surgeryRate: z.string(),
  examTime: z.string(),
  recommendedR: z.string(),
  recommendedL: z.string(),
  surgeryRegDate: z.string(),
  surgeryReserveDate: z.string(),
  surgeryDate: z.string(),
  surgeryR: z.string(),
  surgeryL: z.string(),
  surgeon: z.string(),
  payment: z.string(),
  counselor: z.string(),
  doctor: z.string(),
  jumin: z.string(),
  birth: z.string(),
  lunar: z.string(),
  phone1: z.string(),
  phone2: z.string(),
  email: z.string(),
  zip: z.string(),
  addr1: z.string(),
  addr2: z.string(),
  memo: z.string(),
  examStop: z.string(),
  opImpossible: z.string(),
  route: z.string(),
  section: z.string(),
  motiveL: z.string(),
  motiveM: z.string(),
  motiveS: z.string(),
  motiveMemo: z.string(),
  optometrist: z.string(),
  cancelCode: z.string(),
  cancelMemo: z.string(),
  grade: z.string(),
  job: z.string(),
  lastVisit: z.string(),
  insurance: z.string(),
  nationality: z.string(),
})

export type ExamListItem = z.infer<typeof examListItemSchema>

const examListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(examListItemSchema),
  message: z.string().nullish(),
})

export const examListApi = {
  getExamList: async (from: string, to: string): Promise<ExamListItem[]> => {
    const res = await api.get<unknown>(withQuery('/exam-list', { from, to }))
    return examListResponseSchema.parse(res).data
  },
}
