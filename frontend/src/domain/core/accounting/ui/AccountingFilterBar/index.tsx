import { Download } from 'lucide-react'
import type { ReactNode } from 'react'

import type { FilterState } from '#shared/hooks/useFilter'
import { Button } from '#shared/ui/Button'
import { Filter } from '#shared/ui/Filter'
import { type DateRange, validateRange } from '#shared/utils/date'

/** 백엔드 AccountingController 조회 기간 제한과 같다. */
export const ACCOUNTING_MAX_DAYS = 366

/** useFilter validate — 366일 제한을 미리 막는다. */
export const validateAccountingRange = ({ range }: { range: DateRange }) =>
  validateRange(range, { maxDays: ACCOUNTING_MAX_DAYS })

interface Props {
  filter: FilterState<{ range: DateRange }>
  isFetching: boolean
  refetch: () => unknown
  /** 마트 적재 기준일·적재 범위 */
  dataDate: string
  dataRange: string
  onCsv: () => void
  /** 기간 뒤에 놓일 화면별 조건(받아온 행을 바로 거르는 것들) */
  children: ReactNode
}

/**
 * 회계 화면 공용 첫 줄 — 수납일 기간만 [조회] 대상이고, children 자리의 조건은 화면이 들고 바로 반영한다.
 * 진료 수납 · 시력교정 매출 내역 · 시력교정 매출 집계가 함께 쓴다.
 */
export function AccountingFilterBar({
  filter,
  isFetching,
  refetch,
  dataDate,
  dataRange,
  onCsv,
  children,
}: Props) {
  return (
    <Filter.Root filter={filter} isFetching={isFetching} refetch={refetch}>
      <Filter.Bar>
        <Filter.DateRange
          {...filter.field('range')}
          maxDays={ACCOUNTING_MAX_DAYS}
          ariaLabel="수납 기간"
        />
        <span className="mx-1 h-6 w-px bg-gray-200" />
        {children}
        <Filter.Actions>
          <span className="order-first pr-1 text-[11px] text-gray-500">
            데이터 기준 <b className="text-gray-700">{dataDate}</b>
            {dataRange && <> · {dataRange}</>}
          </span>
          <Button
            type="button"
            size="sm"
            className="bg-emerald-600 text-xs text-white hover:bg-emerald-700"
            onClick={onCsv}
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
        </Filter.Actions>
      </Filter.Bar>
    </Filter.Root>
  )
}
