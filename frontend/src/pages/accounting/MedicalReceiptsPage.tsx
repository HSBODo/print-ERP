import { useEffect, useMemo, useState } from 'react'
import type { MedicalReceipt } from '@/api/accounting'
import { useAccountingStatus, useMedicalReceipts } from '@/hooks/accounting/useAccounting'
import type { AccountingFilterState } from './accountingTypes'
import {
  MedicalReceiptFilters,
  MedicalReceiptToolbar,
  type MedicalExtraFilters,
} from './MedicalReceiptControls'
import { MedicalReceiptTable } from './MedicalReceiptTable'
import { dataStamp, matchesKeyword } from './accountingModel'
import { currentMonthRange } from './accountingPeriod'
import { downloadMedicalCsv } from './medicalReceiptCsv'

const DEFAULT_FILTER: AccountingFilterState = {
  mode: 'daily',
  ...currentMonthRange(),
  category: '전체',
  keyword: '',
}

const DEFAULT_EXTRA_FILTERS: MedicalExtraFilters = {
  insurance: '전체',
  status: '전체',
  outstanding: '전체',
  support: '전체',
  breakdown: '전체',
}

const IDLE_MESSAGE = '기간을 고르고 [조회]를 누르면 진료 수납 내역을 불러옵니다.'

const matchesCategory = (row: MedicalReceipt, category: string) => {
  if (category === '전체') return true
  if (category === '백내장') return row.revenueType === '입원' || row.revenueType === '입원외'
  return row.receiptType === category
}

const hasSupport = (row: MedicalReceipt) =>
  row.welfareSupport > 0 ||
  row.disabledSupport > 0 ||
  row.supportAmount > 0 ||
  row.healthLivingExpense > 0

const filterRows = (
  rows: MedicalReceipt[],
  filter: AccountingFilterState,
  extra: MedicalExtraFilters,
) => rows
  .filter((row) => matchesCategory(row, filter.category))
  .filter((row) => extra.insurance === '전체' || row.insuranceType === extra.insurance)
  .filter((row) => extra.status === '전체' || row.status === extra.status)
  .filter((row) => extra.outstanding === '전체' || row.outstanding > 0)
  .filter((row) => extra.support === '전체' || hasSupport(row))
  .filter((row) => matchesKeyword([row.patientName, row.chartNo, row.doctor], filter.keyword))

/** 보험유형 선택지 — 조회된 행에서 뽑는다 (원형과 동일 · 마트에 어떤 유형이 오든 그대로 노출). */
const insuranceOptionsOf = (rows: MedicalReceipt[]) => [
  '전체',
  ...new Set(rows.map((row) => row.insuranceType).filter(Boolean).sort((a, b) => a.localeCompare(b, 'ko'))),
]

/**
 * 진입·초기화 = 필터 기본값 + 빈 표. [조회](F1) 를 눌러야 불러온다.
 * applied 가 null 이면 조회하지 않고, resetKey 로 표(정렬·페이지)를 새로 마운트한다.
 */
export function MedicalReceiptsPage() {
  const [draft, setDraft] = useState(DEFAULT_FILTER)
  const [applied, setApplied] = useState<AccountingFilterState | null>(null)
  const [extra, setExtra] = useState(DEFAULT_EXTRA_FILTERS)
  const [resetKey, setResetKey] = useState(0)
  const query = useMedicalReceipts(applied ? { from: applied.from, to: applied.to } : null)
  const status = useAccountingStatus()
  const rows = useMemo(
    () => (applied ? filterRows(query.data ?? [], applied, extra) : []),
    [query.data, applied, extra],
  )
  const insuranceOptions = useMemo(() => insuranceOptionsOf(query.data ?? []), [query.data])
  const stamp = dataStamp(status.data?.medicalLoadedAt, status.data?.medicalFrom, status.data?.medicalTo)

  const search = () => {
    const normalized = draft.from <= draft.to ? draft : { ...draft, from: draft.to, to: draft.from }
    setDraft(normalized)
    setApplied(normalized)
  }
  const reset = () => {
    setDraft(DEFAULT_FILTER)
    setApplied(null)
    setExtra(DEFAULT_EXTRA_FILTERS)
    setResetKey((key) => key + 1)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'F1') return
      event.preventDefault()
      setApplied(draft)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [draft])

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[560px] flex-col gap-2">
      <MedicalReceiptToolbar
        value={draft}
        dataDate={stamp.date}
        dataRange={stamp.range}
        onChange={setDraft}
        onSearch={search}
        onReset={reset}
        onCsv={() => downloadMedicalCsv(rows)}
      />
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
          emptyMessage={applied ? undefined : IDLE_MESSAGE}
        />
      )}
    </div>
  )
}
