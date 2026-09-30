import { useMemo, useState } from 'react'
import type { VisionReceipt } from '../../type/accounting'
import {
  useAccountingStatus,
  useVisionReceipts,
} from '../../hooks/useAccounting'
import type { AccountingFilterState } from '../../type/filter'
import { dataStamp, matchesKeyword } from '../../utils/accountingModel'
import { currentMonthRange } from '../../utils/accountingPeriod'
import {
  VisionRevenueFilters,
  VisionRevenueToolbar,
  type VisionExtraFilters,
} from '../VisionRevenueControls'
import { downloadVisionRevenueCsv } from './visionRevenueCsv'
import { VisionRevenueTable } from './VisionRevenueTable'

const DEFAULT_FILTER: AccountingFilterState = {
  mode: 'daily',
  ...currentMonthRange(),
  category: '전체',
  keyword: '',
}

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
  filter: AccountingFilterState,
  extra: VisionExtraFilters,
) =>
  rows
    .filter(
      (row) =>
        filter.category === '전체' || paymentGroup(row) === filter.category,
    )
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
        filter.keyword,
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

/** 진입·초기화 = 필터 기본값으로 바로 조회. 이후 조건 변경은 [조회] 를 눌러야 반영된다 (진료 수납 화면과 같은 규칙). */
export function VisionRevenuePage() {
  const [draft, setDraft] = useState(DEFAULT_FILTER)
  const [applied, setApplied] = useState(DEFAULT_FILTER)
  const [extra, setExtra] = useState(DEFAULT_EXTRA_FILTERS)
  const [resetKey, setResetKey] = useState(0)
  const query = useVisionReceipts({ from: applied.from, to: applied.to })
  const status = useAccountingStatus()
  const rows = useMemo(
    () => filterRows(query.data ?? [], applied, extra),
    [query.data, applied, extra],
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

  const search = () => {
    const normalized =
      draft.from <= draft.to
        ? draft
        : { ...draft, from: draft.to, to: draft.from }
    setDraft(normalized)
    setApplied(normalized)
  }
  const reset = () => {
    setDraft(DEFAULT_FILTER)
    setApplied(DEFAULT_FILTER)
    setExtra(DEFAULT_EXTRA_FILTERS)
    setResetKey((key) => key + 1)
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[560px] flex-col gap-2">
      <VisionRevenueToolbar
        value={draft}
        dataDate={stamp.date}
        dataRange={stamp.range}
        onChange={setDraft}
        onSearch={search}
        onReset={reset}
        onCsv={() => downloadVisionRevenueCsv(rows, applied.from, applied.to)}
      />
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
