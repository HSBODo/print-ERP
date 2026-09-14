import type { FC } from 'react'
import { OverseasPage } from './OverseasPage'
import { MarketingPage } from './MarketingPage'
import { ChannelProfitPage } from './ChannelProfitPage'
import { ChannelAnalysisPage } from './ChannelAnalysisPage'
import { AccumulatedEyesPage } from './AccumulatedEyesPage'

/** 마케팅(marketing) 도메인 페이지 레지스트리 (sms 는 별도 pages/sms/routes.ts). */
export const marketingPageRoutes: Record<string, FC> = {
  'overseas': OverseasPage,
  'marketing': MarketingPage,
  'channel-profit': ChannelProfitPage,
  'channel-analysis': ChannelAnalysisPage,
  'accumulated-eyes': AccumulatedEyesPage,
}
