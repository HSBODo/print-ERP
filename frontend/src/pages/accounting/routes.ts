import type { FC } from 'react'
import { MedicalReceiptsPage } from './MedicalReceiptsPage'
import { MedicalRevenueChartPage } from './MedicalRevenueChartPage'
import { VisionRevenuePage } from './VisionRevenuePage'
import { VisionRevenueChartPage } from './VisionRevenueChartPage'
import { VisionRevenueSummaryPage } from './VisionRevenueSummaryPage'

export const accountingPageRoutes: Record<string, FC> = {
  'accounting-medical': MedicalReceiptsPage,
  'accounting-vision': VisionRevenuePage,
  'accounting-vision-summary': VisionRevenueSummaryPage,
  'accounting-vision-chart': VisionRevenueChartPage,
  'accounting-medical-chart': MedicalRevenueChartPage,
}
