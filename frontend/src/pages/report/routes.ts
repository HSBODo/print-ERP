import type { FC } from 'react'
import { WeeklyReportPage } from './WeeklyReportPage'
import { MonthlyReportPage } from './MonthlyReportPage'

/** Report 도메인 페이지 레지스트리 (pageId → 컴포넌트) */
export const reportPageRoutes: Record<string, FC> = {
  'weekly-report': WeeklyReportPage,
  'monthly-report': MonthlyReportPage,
}
