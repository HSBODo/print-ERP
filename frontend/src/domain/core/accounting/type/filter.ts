import type { PeriodMode } from '../utils/accountingModel'

export interface AccountingFilterState {
  mode: PeriodMode
  from: string
  to: string
  category: string
  keyword: string
}
