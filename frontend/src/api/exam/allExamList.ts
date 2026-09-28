import { z } from 'zod'
import { api } from '#shared/api/client'
import { withQuery } from '#shared/api/utils'

/**
 * 전체 검사자 리스트 — 시력교정(EXAM) + 백내장(Cataract_Exam) 통합 행 목록.
 * 백엔드: GET /api/all-exam-list?from&to → ApiResponse<List<Map>> (camelCase 키).
 * 시력교정(EXAM)·백내장 모두 사람 단위. 백내장은 레거시 BCRM 백내장_검사와 동일(RESERVATION FLAG='H', JINRYO='1').
 * 시력교정 검사유입은 종합지표(사람)와 정합. 전 컬럼 문자열.
 *   examGroup: 시력교정/드림렌즈/백내장 · introType: 일반/고객소개/직원소개 · jobBucket: 직장인/학생/기타
 */
const allExamListItemSchema = z.object({
  chartNo: z.string(),
  name: z.string(),
  examDate: z.string(),
  examGroup: z.string(),
  // 원데이/일반 이진값 — 빈칸 없음(2026-08-05).
  //   시력교정 = 같은날 검사OP(M/5) 예약 내원 / 백내장 = 진료구분 C_원데이·C_노안원데이 / 드림렌즈 = 항상 일반
  examType: z.string(),
  cataractClass: z.string(), // 백내장분류: 백내장/중단/노안·FU/기타 (백내장 리스트 classification과 동일, 그 외 검사구분은 '')
  patientType: z.string(),
  introType: z.string(),
  motiveReport: z.string(), // 내원동기(레포트): 내원동기(대) → 9계열 매핑 (B2B군인/B2B기업/소개고객/소개직원/광고/기타/바이럴/프로모션/홈페이지)
  motiveL: z.string(),
  motiveM: z.string(),
  motiveS: z.string(),
  jobBucket: z.string(),
  job: z.string(),
  grade: z.string(),
  birth: z.string(),
  phone2: z.string(),
  phone1: z.string(),
  email: z.string(),
  counselor: z.string(),
  doctor: z.string(),
  optometrist: z.string(),
  lastVisit: z.string(),
  memo: z.string(),
})

export type AllExamListItem = z.infer<typeof allExamListItemSchema>

const allExamListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(allExamListItemSchema),
  message: z.string().nullish(),
})

export const allExamListApi = {
  getAllExamList: async (from: string, to: string): Promise<AllExamListItem[]> => {
    const res = await api.get<unknown>(withQuery('/all-exam-list', { from, to }))
    return allExamListResponseSchema.parse(res).data
  },
}
