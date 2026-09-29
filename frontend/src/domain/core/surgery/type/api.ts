import { z } from 'zod'
import { apiResponseOf } from '#shared/api/utils'

/* ── Monthly (수술 건수 페이지용) ── */

const surgeryMonthlyItemSchema = z.object({
  year: z.number(), month: z.number(),
  lasek: z.number(), lasik: z.number(), smile: z.number(), smilePro: z.number(),
  icl: z.number(), tIcl: z.number(), kpl: z.number(), tKpl: z.number(), viva: z.number(),
  // presbyond: 노안 레이저 / piolPatients: PIOL DISTINCT 환자 수(유형별 합산 아님).
  // 마트 재적재 전 옛 응답과의 호환을 위해 optional.
  presbyond: z.number().optional(), piolPatients: z.number().optional(),
  catMulti: z.number(), catMono: z.number(), catEdof: z.number(),
  xtra: z.number().optional(), waveVision: z.number().optional(), monoVision: z.number().optional(),
  contra: z.number().optional(), personal: z.number().optional(),
  lasekEx: z.number().optional(), lasekRed: z.number().optional(),
  reoperation: z.number().optional(), reopLaser: z.number().optional(), reopLens: z.number().optional(),
  visionPatients: z.number().optional(), cataractPatients: z.number().optional(),
  total: z.number(),
})
export type SurgeryMonthlyItem = z.infer<typeof surgeryMonthlyItemSchema>
export const surgeryMonthlyResponseSchema = apiResponseOf(z.array(surgeryMonthlyItemSchema))

/* ── Daily (수술별 비중 일별 모드용) ── */

const surgeryDailyItemSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  lasek: z.number(), lasik: z.number(), smile: z.number(), smilePro: z.number(),
  icl: z.number(), tIcl: z.number(), kpl: z.number(), tKpl: z.number(), viva: z.number(),
  // presbyond: 노안 레이저 / piolPatients: PIOL DISTINCT 환자 수(유형별 합산 아님).
  // 마트 재적재 전 옛 응답과의 호환을 위해 optional.
  presbyond: z.number().optional(), piolPatients: z.number().optional(),
  catMulti: z.number(), catMono: z.number(), catEdof: z.number(),
  xtra: z.number().optional(), waveVision: z.number().optional(), monoVision: z.number().optional(),
  contra: z.number().optional(), personal: z.number().optional(),
  lasekEx: z.number().optional(), lasekRed: z.number().optional(),
  reoperation: z.number().optional(), reopLaser: z.number().optional(), reopLens: z.number().optional(),
  visionPatients: z.number().optional(), cataractPatients: z.number().optional(),
  total: z.number(),
})
export type SurgeryDailyItem = z.infer<typeof surgeryDailyItemSchema>

/** 응답 메타 — 출처(마트/라이브) 표시용. NON_NULL이라 대부분 optional. */
const surgeryDailyMetaSchema = z.object({
  source: z.enum(['LIVE', 'MART', 'UNAVAILABLE']).optional(),
  period: z.string().optional(),
}).optional()
export type SurgeryDailyMeta = z.infer<typeof surgeryDailyMetaSchema>
export const surgeryDailyResponseSchema = apiResponseOf(z.array(surgeryDailyItemSchema), surgeryDailyMetaSchema)

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

export const surgeryListResponseSchema = apiResponseOf(z.array(surgeryListItemSchema))

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

export const reoperationCandidatesResponseSchema = apiResponseOf(z.array(reoperationCandidateSchema))

/**
 * 재수술 검토 판정 저장·조회 — (차트번호, 수술일) 유니크로 upsert.
 * 저장이 없는 조합은 "미검토" 상태라 자동판정을 그대로 쓴다.
 */
const reoperationDecisionRowSchema = z.object({
  id: z.number(),
  chartNo: z.string(),
  opDate: z.string(),
  againR: z.string(),
  againL: z.string(),
  isReoperation: z.boolean(),
  memo: z.string().nullish(),
  updatedAt: z.string().nullish(),
  updatedBy: z.string().nullish(),
})

export type ReoperationDecisionRow = z.infer<typeof reoperationDecisionRowSchema>

export const reoperationDecisionListResponseSchema = apiResponseOf(z.array(reoperationDecisionRowSchema))

export const reoperationDecisionSaveResponseSchema = apiResponseOf(z.array(reoperationDecisionRowSchema))

export interface ReoperationDecisionSaveItem {
  chartNo: string
  opDate: string
  againR: string
  againL: string
  isReoperation: boolean
  memo?: string
}
