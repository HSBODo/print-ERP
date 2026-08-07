import type { FC } from 'react'
import { OverseasPage } from './OverseasPage'
import { MarketingPage } from './MarketingPage'
import { ChannelProfitPage } from './ChannelProfitPage'
import { ChannelAnalysisPage } from './ChannelAnalysisPage'

/** 마케팅(marketing) 도메인 페이지 레지스트리 */
export const marketingPageRoutes: Record<string, FC> = {
  'overseas': OverseasPage,
  'marketing': MarketingPage,
  'channel-profit': ChannelProfitPage,
  'channel-analysis': ChannelAnalysisPage,
}
