import type { FC } from 'react'
import { B2BRevenuePage } from './B2BRevenuePage'
import { DreamlensLedgerPage } from './dreamlens-ledger/DreamlensLedgerPage'

/** 기타(etc) 도메인 페이지 레지스트리 */
export const etcPageRoutes: Record<string, FC> = {
  'b2b-revenue': B2BRevenuePage,
  // id·경로는 dreamlens-revenue 를 유지하되 화면은 직접 입력하는 장부 테이블이다.
  'dreamlens-revenue': DreamlensLedgerPage,
}
