import { z } from 'zod'

import { apiResponseOf } from '#shared/api/utils'

/* ── Monthly (검사 건수 페이지용) ── */

const examinationMonthlyItemSchema = z.object({
  year: z.number(),
  month: z.number(),
  visionCorrection: z.number(),
  dreamlens: z.number(),
  cataract: z.number().optional(),
  examTotal: z.number().optional(),
  total: z.number(),
})
export type ExaminationMonthlyItem = z.infer<
  typeof examinationMonthlyItemSchema
>
export const examinationResponseSchema = apiResponseOf(
  z.array(examinationMonthlyItemSchema),
)

/* ── Monthly (시술별 검사 건수 페이지용) ── */

const procedureExamMonthlyItemSchema = z.object({
  year: z.number(),
  month: z.number(),
  examCount: z.number(),
  oneDayExamCount: z.number(),
  total: z.number().optional(),
})
export type ProcedureExamMonthlyItem = z.infer<
  typeof procedureExamMonthlyItemSchema
>
export const procedureExamResponseSchema = apiResponseOf(
  z.array(procedureExamMonthlyItemSchema),
)

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
  surgeryReserveDate: z.string(),
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

export const allExamListResponseSchema = apiResponseOf(
  z.array(allExamListItemSchema),
)

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

export const cataractExamListResponseSchema = apiResponseOf(
  z.array(cataractExamListItemSchema),
)

const eoeisCheckupRowSchema = z.object({
  operatorName: z.string(),
  deviceName: z.string(),
  date: z.string(),
  count: z.number(),
})

export const eoeisCheckupResultSchema = z.object({
  rows: z.array(eoeisCheckupRowSchema),
  scores: z.record(z.string(), z.number()),
})

export type EoeisCheckupRow = z.infer<typeof eoeisCheckupRowSchema>
export type EoeisCheckupResult = z.infer<typeof eoeisCheckupResultSchema>

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

export const examCountByClassResponseSchema = apiResponseOf(
  z.array(examCountByClassRowSchema),
)

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

export const examListResponseSchema = apiResponseOf(z.array(examListItemSchema))
