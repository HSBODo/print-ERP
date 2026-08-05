import { z } from 'zod'
import { api } from '@/api/client'
import { apiResponseOf, withQuery } from '@/api/_shared'

/* ── 주차 레포트 (ISO 8601 연간 주차) ── */

/** 값이 없으면 null — "그 주에는 알 수 없음"(0 과 구분). 프론트는 선을 끊는다. */
const count = z.number().nullable()

const weeklyReportItemSchema = z.object({
  year: z.number(),   // ISO 주차연도
  week: z.number(),   // 1~53
  startDate: z.string(),
  endDate: z.string(),

  // 예약
  reservations: count,
  call: count,
  online: count,

  // 검사 유입
  introGeneral: count,
  introCustomer: count,
  introStaff: count,
  jobOffice: count,
  jobStudent: count,
  jobEtc: count,

  // 검사수
  examTotal: count,
  visionExam: count,
  cataractExam: count,
  oneDay: count,

  // 비율 계산용 원시값
  visionBooked: count,
  cataractExamEyes: count,
  cataractBooked: count,
  oneDayBooked: count,
  stopCount: count,
  examGeneralBase: count,
  bookedGeneral: count,

  // 수술
  visionSurgery: count,
  cataractSurgery: count,
  totalSurgery: count,

  // 외래
  outpatient: count,

  // 드림렌즈 — 외래센터 주간보고 확정값(마트 골든 시드). 시드가 없는 주는 null.
  dreamlensNew: count,
  dreamlensFu: count,
})

export type WeeklyReportItem = z.infer<typeof weeklyReportItemSchema>

const weeklyReportResponseSchema = apiResponseOf(z.array(weeklyReportItemSchema))

export const reportApi = {
  /**
   * 연도별 주차 레포트 원시 집계 — 데이터가 있는 주만 내려온다.
   * 파생 지표(예약률·비율·중단율)는 화면에서 이 원시 값으로 계산한다.
   */
  getWeeklyReport: async (years: number[]) =>
    weeklyReportResponseSchema.parse(await api.get<unknown>(withQuery('/report/weekly', { years }))).data,
}
