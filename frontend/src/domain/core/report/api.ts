import { api } from '#shared/api/client'

import { weeklyReportResponseSchema } from './type/api'

export const reportApi = {
  /**
   * 연도별 주차 레포트 원시 집계 — 데이터가 있는 주만 내려온다.
   * 파생 지표(예약률·비율·중단율)는 화면에서 이 원시 값으로 계산한다.
   */
  getWeeklyReport: async (years: number[], signal?: AbortSignal) => {
    const { data } = await api.get('/report/weekly', {
      params: { years },
      signal,
    })
    return weeklyReportResponseSchema.parse(data).data
  },
}
