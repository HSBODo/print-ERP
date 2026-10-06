import { useMemo, useState } from 'react'

import { useFilter } from '#shared/hooks/useFilter'
import { Filter } from '#shared/ui/Filter'
import { thisMonthRange } from '#shared/utils/date'

import {
  useAccountingStatus,
  useVisionReceipts,
} from '../../hooks/useAccounting'
import type { VisionReceipt } from '../../type/accounting'
import { dataStamp, matchesKeyword } from '../../utils/accountingModel'
import {
  AccountingFilterBar,
  validateAccountingRange,
} from '../AccountingFilterBar'
import {
  type VisionExtraFilters,
  VisionRevenueFilters,
} from '../VisionRevenueControls'
import { downloadVisionRevenueCsv } from './visionRevenueCsv'
import { VisionRevenueTable } from './VisionRevenueTable'

const PAYMENTS = ['전체', '카드', '현금'] as const
type Payment = (typeof PAYMENTS)[number]
const ALL_PAYMENT: Payment = '전체'

const DEFAULT_EXTRA_FILTERS: VisionExtraFilters = {
  category: '전체',
  acquirer: '전체',
  status: '전체',
  tax: '전체',
  breakdown: '전체',
}

/** 결제수단 — 원본 수납방법 중 '카드' 만 카드, 나머지(현금·현금영수·통장…)는 현금 버킷 (레거시 피벗 기준). */
const paymentGroup = (row: VisionReceipt) =>
  row.paymentMethod === '카드' ? '카드' : '현금'

const filterRows = (
  rows: VisionReceipt[],
  payment: Payment,
  keyword: string,
  extra: VisionExtraFilters,
) =>
  rows
    .filter((row) => payment === '전체' || paymentGroup(row) === payment)
    .filter(
      (row) => extra.category === '전체' || row.category === extra.category,
    )
    .filter(
      (row) => extra.acquirer === '전체' || row.acquirer === extra.acquirer,
    )
    .filter((row) => extra.status === '전체' || row.status === extra.status)
    .filter(
      (row) =>
        extra.tax === '전체' ||
        (extra.tax === '과세' ? row.taxable !== 0 : row.exempt !== 0),
    )
    .filter((row) =>
      matchesKeyword(
        [row.patientName, row.chartNo, row.surgeon, row.counselor],
        keyword,
      ),
    )

const optionsOf = (rows: VisionReceipt[], key: 'category' | 'acquirer') => [
  '전체',
  ...new Set(
    rows
      .map((row) => row[key])
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'ko')),
  ),
]

/** 진입·초기화 = 이번 달로 바로 조회. 수납 기간만 [조회] 때 반영되고, 결제수단·검색·둘째 줄 조건은 바로 거른다 (진료 수납 화면과 같은 규칙). */
export function VisionRevenuePage() {
  const filter = useFilter({
    defaults: () => ({ range: thisMonthRange() }),
    validate: validateAccountingRange,
    onReset: () => {
      setPayment(ALL_PAYMENT)
      setKeyword('')
      setExtra(DEFAULT_EXTRA_FILTERS)
      setResetKey((key) => key + 1)
    },
  })
  const { range } = filter.applied
  const [payment, setPayment] = useState(ALL_PAYMENT)
  const [keyword, setKeyword] = useState('')
  const [extra, setExtra] = useState(DEFAULT_EXTRA_FILTERS)
  const [resetKey, setResetKey] = useState(0)
  const query = useVisionReceipts(range)
  const status = useAccountingStatus()
  const rows = useMemo(
    () => filterRows(query.data ?? [], payment, keyword, extra),
    [query.data, payment, keyword, extra],
  )
  const categories = useMemo(
    () => optionsOf(query.data ?? [], 'category'),
    [query.data],
  )
  const acquirers = useMemo(
    () => optionsOf(query.data ?? [], 'acquirer'),
    [query.data],
  )
  const stamp = dataStamp(
    status.data?.visionLoadedAt,
    status.data?.visionFrom,
    status.data?.visionTo,
  )

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[560px] flex-col gap-2">
      <AccountingFilterBar
        filter={filter}
        isFetching={query.isFetching}
        refetch={query.refetch}
        dataDate={stamp.date}
        dataRange={stamp.range}
        onCsv={() => downloadVisionRevenueCsv(rows, range.from, range.to)}
      >
        <Filter.Segment
          value={payment}
          onChange={setPayment}
          options={PAYMENTS}
          ariaLabel="결제수단"
        />
        <Filter.Keyword
          value={keyword}
          onChange={setKeyword}
          placeholder="고객명 · 고객번호 · 집도의 · 상담사"
          className="w-[210px]"
        />
      </AccountingFilterBar>
      <VisionRevenueFilters
        value={extra}
        categories={categories}
        acquirers={acquirers}
        onChange={setExtra}
      />
      {query.isError ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          시력교정 매출 데이터를 불러오지 못했습니다.
        </div>
      ) : (
        <VisionRevenueTable
          key={resetKey}
          rows={rows}
          breakdown={extra.breakdown}
        />
      )}
    </div>
  )
}
