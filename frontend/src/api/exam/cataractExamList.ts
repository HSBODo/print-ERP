import { z } from 'zod'
import { api } from '#shared/api/client'
import { withQuery } from '#shared/api/utils'

/**
 * 백내장 검사자 리스트 — 성민CRM "백내장 검사자 리스트"(FrmCataract_ExamList).
 * 검사자 리스트(시력교정)와 동일한 49필드 계약(전 컬럼 문자열). 소스만 Cataract_Exam 계열.
 * 백엔드: GET /api/cataract-exam-list?from&to → ApiResponse<List<Map>>.
 */
const cataractExamListItemSchema = z.object({
  chartNo: z.string(),
  name: z.string(),
  nameEng: z.string(),
  examDate: z.string(),
  examType: z.string(),
  examRegDate: z.string(),
  examCategory: z.string(),
  /**
   * 레거시 내원동기 분류 4종 — 검안사(MY_OPTOMETRIST)·상담사(MY_COUNSELOR) 배정 조합으로 갈린다.
   *   '백내장'  검안사 O + 상담사 O
   *   '중단'    검안사 O + 상담사 BS0808(BS미지정)
   *   '노안/FU' 검안사 X + 상담사 BS0808 — 레거시 라벨 'F/U'
   *   '기타'    그 외
   * ⚠️ 월간 레포트 백내장 검사수 = '백내장' + '중단' 만. 리스트 총건수를 검사수로 쓰지 말 것.
   */
  classification: z.string(),
  patientType: z.string(),
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

export type CataractExamListItem = z.infer<typeof cataractExamListItemSchema>

const cataractExamListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(cataractExamListItemSchema),
  message: z.string().nullish(),
})

export const cataractExamListApi = {
  getCataractExamList: async (from: string, to: string): Promise<CataractExamListItem[]> => {
    const res = await api.get<unknown>(withQuery('/cataract-exam-list', { from, to }))
    return cataractExamListResponseSchema.parse(res).data
  },
}
