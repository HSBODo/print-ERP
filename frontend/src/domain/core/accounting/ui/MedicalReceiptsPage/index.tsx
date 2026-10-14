import { useMemo, useState } from 'react'

import { useFilter } from '#shared/hooks/useFilter'
import { Filter } from '#shared/ui/Filter'
import { thisMonthRange } from '#shared/utils/date'

import {
  useAccountingStatus,
  useMedicalReceipts,
} from '../../hooks/useAccounting'
import type { MedicalReceipt } from '../../type/accounting'
import { dataStamp, matchesKeyword } from '../../utils/accountingModel'
import {
  AccountingFilterBar,
  validateAccountingRange,
} from '../AccountingFilterBar'
import {
  type MedicalExtraFilters,
  MedicalReceiptFilters,
} from './MedicalReceiptControls'
import { downloadMedicalCsv } from './medicalReceiptCsv'
import { MedicalReceiptTable } from './MedicalReceiptTable'

const CATEGORIES = ['전체', '외래', '입원', '백내장'] as const
type Category = (typeof CATEGORIES)[number]
const ALL_CATEGORY: Category = '전체'

const DEFAULT_EXTRA_FILTERS: MedicalExtraFilters = {
  insurance: '전체',
  status: '전체',
  outstanding: '전체',
  support: '전체',
  breakdown: '전체',
}

const matchesCategory = (row: MedicalReceipt, category: string) => {
  if (category === '전체') return true
  if (category === '백내장')
    return row.revenueType === '입원' || row.revenueType === '입원외'
  return row.receiptType === category
}

const hasSupport = (row: MedicalReceipt) =>
  row.welfareSupport > 0 ||
  row.disabledSupport > 0 ||
  row.supportAmount > 0 ||
  row.healthLivingExpense > 0

const filterRows = (
  rows: MedicalReceipt[],
  category: Category,
  keyword: string,
  extra: MedicalExtraFilters,
) =>
  rows
    .filter((row) => matchesCategory(row, category))
    .filter(
      (row) =>
        extra.insurance === '전체' || row.insuranceType === extra.insurance,
    )
    .filter((row) => extra.status === '전체' || row.status === extra.status)
    .filter((row) => extra.outstanding === '전체' || row.outstanding > 0)
    .filter((row) => extra.support === '전체' || hasSupport(row))
    .filter((row) =>
      matchesKeyword([row.patientName, row.chartNo, row.doctor], keyword),
    )

/** 보험유형 선택지 — 조회된 행에서 뽑는다 (원형과 동일 · 마트에 어떤 유형이 오든 그대로 노출). */
const insuranceOptionsOf = (rows: MedicalReceipt[]) => [
  '전체',
  ...new Set(
    rows
      .map((row) => row.insuranceType)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'ko')),
  ),
]

/**
 * 진입·초기화 = 이번 달로 바로 조회. 수납 기간만 [조회](F1) 때 반영되고, 구분·검색·둘째 줄 조건은 바로 거른다.
 * 초기화는 resetKey 로 표(정렬·페이지)를 새로 마운트한다.
 */
export function MedicalReceiptsPage() {
  const filter = useFilter({
    defaults: () => ({ range: thisMonthRange() }),
    validate: validateAccountingRange,
    onReset: () => {
      setCategory(ALL_CATEGORY)
      setKeyword('')
      setExtra(DEFAULT_EXTRA_FILTERS)
      setResetKey((key) => key + 1)
    },
  })
  const [category, setCategory] = useState(ALL_CATEGORY)
  const [keyword, setKeyword] = useState('')
  const [extra, setExtra] = useState(DEFAULT_EXTRA_FILTERS)
  const [resetKey, setResetKey] = useState(0)
  const query = useMedicalReceipts(filter.applied.range)
  const status = useAccountingStatus()
  const rows = useMemo(
    () => filterRows(query.data ?? [], category, keyword, extra),
    [query.data, category, keyword, extra],
  )
  const insuranceOptions = useMemo(
    () => insuranceOptionsOf(query.data ?? []),
    [query.data],
  )
  const stamp = dataStamp(
    status.data?.medicalLoadedAt,
    status.data?.medicalFrom,
    status.data?.medicalTo,
  )

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[560px] flex-col gap-2">
      <AccountingFilterBar
        filter={filter}
        isFetching={query.isFetching}
        refetch={query.refetch}
        dataDate={stamp.date}
        dataRange={stamp.range}
        onCsv={() => downloadMedicalCsv(rows)}
      >
        <Filter.Segment
          value={category}
          onChange={setCategory}
          options={CATEGORIES}
          ariaLabel="구분"
        />
        <Filter.Keyword
          value={keyword}
          onChange={setKeyword}
          placeholder="환자명 · 차트번호 · 진료의사"
          className="w-[200px]"
        />
      </AccountingFilterBar>
      <MedicalReceiptFilters
        value={extra}
        insuranceOptions={insuranceOptions}
        onChange={setExtra}
      />
      {query.isError ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          진료 수납 데이터를 불러오지 못했습니다.
        </div>
      ) : (
        <MedicalReceiptTable
          key={resetKey}
          rows={rows}
          breakdown={extra.breakdown}
        />
      )}
    </div>
  )
}
