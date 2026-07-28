import type { FC } from 'react'
import { OutpatientCountPage } from './OutpatientCountPage'
import { OutpatientListPage } from './OutpatientListPage'

/** 외래(outpatient) 도메인 페이지 레지스트리 */
export const outpatientPageRoutes: Record<string, FC> = {
  'outpatient-list': OutpatientListPage,
  'outpatient-count': OutpatientCountPage,
}
