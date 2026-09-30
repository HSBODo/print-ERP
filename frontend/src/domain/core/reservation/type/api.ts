import { z } from 'zod'
import { apiResponseOf } from '#shared/api/utils'

/* ── KPI (예약 KPI 카드용) ── */

const reservationKpiItemSchema = z.object({
  year: z.number(),
  surgery: z.number(),
  outpatient: z.number(),
  dreamlens: z.number(),
  total: z.number(),
})
export type ReservationKpiItem = z.infer<typeof reservationKpiItemSchema>
export const reservationKpiResponseSchema = apiResponseOf(
  z.array(reservationKpiItemSchema),
)

/* ── Monthly (예약 건수 페이지용) ── */

const reservationMonthlyItemSchema = z.object({
  year: z.number(),
  month: z.number(),
  surgery: z.number(),
  outpatient: z.number(),
  dreamlens: z.number(),
  total: z.number(),
})
export type ReservationMonthlyItem = z.infer<
  typeof reservationMonthlyItemSchema
>
export const reservationMonthlyResponseSchema = apiResponseOf(
  z.array(reservationMonthlyItemSchema),
)

/* ── Monthly (예약 종합 페이지용) ── */

const reservationOverallMonthlyItemSchema = z.object({
  year: z.number(),
  month: z.number(),
  reservations: z.number().nullable(),
  online: z.number().nullable(),
  call: z.number().nullable(),
  total: z.number().nullable().optional(),
})
export type ReservationOverallMonthlyItem = z.infer<
  typeof reservationOverallMonthlyItemSchema
>
export const reservationOverallResponseSchema = apiResponseOf(
  z.array(reservationOverallMonthlyItemSchema),
)

/**
 * 예약 변경이력 — 예약일이 1회 이상 바뀐 검사예약(시력교정·드림렌즈·백내장) 명단.
 * 백엔드: GET /api/reservation-change?from&to → ApiResponse<{rows}> (등록일 범위, camelCase 키).
 * 행 1개 = RESERVE_NUM 1개. 마트(list_reservation_change)에는 미변경 예약도 change_count=0 으로 있지만 이 API 는 변경된 예약만 돌려준다.
 *
 * changeChain: "YYYY-MM-DD HH:MM@YYYY-MM-DD|…" — 최초 예약일부터 순서대로(변경시각@그때의 예약일).
 *   시각을 못 읽은 이력은 "@날짜" 로 시각이 빈다. 해석은 pages/reservation/reservation-change/reservationChangeModel.ts.
 * regSource: H 변경이력 첫 저장 · I 등록시각 기록 · N 예약번호 채번일(날짜만 — 화면에 '채번' 표시).
 */
const reservationChangeItemSchema = z.object({
  reserveNum: z.string(),
  registeredAt: z.string(),
  registeredTime: z.string(),
  regSource: z.string(),
  chartNo: z.string(),
  name: z.string(),
  branch: z.string(), // M/D/H
  reserveState: z.string(), // Y/I/H/C
  firstDate: z.string(),
  finalDate: z.string(),
  changeCount: z.number(),
  changeChain: z.string(),
})

export type ReservationChangeItem = z.infer<typeof reservationChangeItemSchema>

export const reservationChangeResponseSchema = apiResponseOf(
  z.object({
    rows: z.array(reservationChangeItemSchema),
  }),
)

export interface ReservationChangeResult {
  rows: ReservationChangeItem[]
}

/**
 * 추이 달력 — 일별·구분별 {day, branch, total, changed}. GET /api/reservation-change/daily?from&to (달력 그리드 범위).
 *   byRegistered  : 등록일 기준(그 날 등록된 검사예약 수 · 그중 예약일이 바뀐 수)
 *   byReserveDate : 예약일 기준(그 날로 잡혀 있는 예약 수 · 그중 바뀐 수 — 미래 달 포함)
 * 마트에는 미변경 예약도 change_count=0 으로 있어 total 이 분모가 된다.
 */
const dailyCountSchema = z.object({
  day: z.string(),
  branch: z.string(),
  total: z.number(),
  changed: z.number(),
})

export type ReservationChangeDailyCount = z.infer<typeof dailyCountSchema>

export const reservationChangeDailyResponseSchema = apiResponseOf(
  z.object({
    byRegistered: z.array(dailyCountSchema),
    byReserveDate: z.array(dailyCountSchema),
  }),
)

export interface ReservationChangeDailyResult {
  byRegistered: ReservationChangeDailyCount[]
  byReserveDate: ReservationChangeDailyCount[]
}

/**
 * 예약자 리스트 — "예약 종합(콜·온라인)" 월간 건수를 구성하는 검사예약 행 목록.
 * 백엔드: GET /api/reservation-list?from&to → ApiResponse<{rows}> (camelCase 키).
 * 집계 기준 날짜 = 등록일(registeredAt). 행 1개 = RESERVE_NUM 1개.
 * 명단 행 합계 = 예약 종합 값(둘 다 카카오 미포함).
 * 전 컬럼 문자열. reserveState: Y(예약)/I(접수)/H(퇴원)/C(취소).
 */
const reservationListItemSchema = z.object({
  registeredAt: z.string(),
  registeredTime: z.string(),
  reserveDate: z.string(),
  reserveTime: z.string(),
  chartNo: z.string(),
  name: z.string(),
  reserveState: z.string(),
  channel: z.string(), // 인콜/아웃콜/홈페이지/네이버
  channelGroup: z.string(), // 콜/온라인
  doctor: z.string(),
  counselor: z.string(),
  comment: z.string(),
  // 내원동기 대/중 — (대)는 상위 갈래(광고·바이럴·소개고객 등), (중)은 실제 유입처
  // ("모두닥"·"인터넷검색(홈페이지)" 등). 둘은 항상 같은 출처(CRM 또는 메모)에서 나온 짝이다.
  // 마트 재적재 전 옛 응답과의 호환을 위해 optional.
  motiveL: z.string().optional(),
  motiveM: z.string().optional(),
  /** TMDB = 텔레매니저 TM 배정 DB(모두닥 이벤트) · CRM = 등록값 · MEMO = 메모의 TM고객(대/중) 에서 추출 */
  motiveMSource: z.string().optional(),
  /** 예약 이후 첫 검사의 검사일(EXAM 에 등록 시각 컬럼이 없어 검사일을 쓴다) */
  examRegDate: z.string().optional(),
  /** 그 검사의 중단 여부 Y/N (검사 없으면 빈값) */
  examStop: z.string().optional(),
  /** 예약 이후 첫 수술예약(FLAG=O)을 잡은 날 — 날짜만 */
  surgeryRegDate: z.string().optional(),
  /** 이 예약으로 이어진 첫 수술의 시술명 우/좌. 수술자 리스트와 같은 원천이라 표기가 일치한다. */
  surgeryR: z.string().optional(),
  surgeryL: z.string().optional(),
  /** 그 수술의 수납액(원). 수술 전이면 0. (고객, 수술일)의 COSTPRICE 합 — 수술자 리스트와 같은 규칙. */
  surgeryPayment: z.number().optional(),
})

export type ReservationListItem = z.infer<typeof reservationListItemSchema>

export const reservationListResponseSchema = apiResponseOf(
  z.object({
    rows: z.array(reservationListItemSchema),
  }),
)

export interface ReservationListResult {
  rows: ReservationListItem[]
}

/**
 * 예약자 리스트_홈페이지 — 레거시 관리자 화면 `counsel/online_list.php`(SCR-39)의 온라인 예약 명단.
 *
 * 소스: 레거시 `TBL_COUNSEL` 을 `CATEGORY='COUNSELONLINE'` 으로 거른 단일 테이블(조인 없음).
 * 백엔드: GET /api/reservation-list-homepage?from&to → ApiResponse<{rows, lastRegDate, live}>.
 *
 * 주의(레거시 원본 동작):
 *  - `regDate`(등록일) 기준 조회다. 예약일(`reserveDate`)이 아니다.
 *  - 화면 No 는 저장값이 아니라 표시용 행번호 — 식별자는 `legacyNo`(C_NO).
 *  - `examType` 라벨은 코드표가 아니라 레거시 PHP 하드코딩 → reservationListHomepageUtils.EXAM_TYPE_LABELS.
 */
const reservationListHomepageItemSchema = z.object({
  legacyNo: z.string(),
  deviceType: z.string(),
  name: z.string(),
  phone: z.string(),
  reserveDate: z.string(),
  reserveTime: z.string(),
  utmSource: z.string(),
  utmMedium: z.string(),
  utmCampaign: z.string(),
  referralCode: z.string(),
  examType: z.string(),
  surgeryTf: z.string(),
  isReserve: z.string(),
  regDate: z.string(),
})

export type ReservationListHomepageItem = z.infer<
  typeof reservationListHomepageItemSchema
>

/**
 * `lastRegDate` — 현재 소스가 담고 있는 마지막 등록일시.
 * `live` — 실시간 소스(레거시 운영 DB 직결)인가. false 면 스냅샷 파일이다.
 *
 * 스냅샷이면 `lastRegDate` 이후 구간이 조용히 비어 나오므로 화면이 조회 종료일과 비교해
 * 경고한다. 실시간이면 그 값은 천장이 아니라 그냥 최근 등록건 시각이라, 같은 비교를 하면
 * 미래 날짜 조회 시 거짓 경고가 뜬다 → `live` 일 때 배너를 끈다.
 */
const reservationListHomepageResultSchema = z.object({
  rows: z.array(reservationListHomepageItemSchema),
  lastRegDate: z.string(),
  live: z.boolean(),
})

export type ReservationListHomepageResult = z.infer<
  typeof reservationListHomepageResultSchema
>

export const reservationListHomepageResponseSchema = apiResponseOf(
  reservationListHomepageResultSchema,
)
