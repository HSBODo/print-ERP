import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { accountingApi, type MedicalReceipt } from '@/api/accounting'
import type { AccountingFilterState } from './accountingTypes'
import {
  MedicalReceiptFilters,
  MedicalReceiptToolbar,
  type MedicalExtraFilters,
} from './MedicalReceiptControls'
import { MedicalReceiptTable } from './MedicalReceiptTable'
import { matchesKeyword } from './accountingModel'
import { downloadMedicalCsv } from './medicalReceiptCsv'

const DEFAULT_FILTER: AccountingFilterState = {
  mode: 'daily',
  from: '2026-08-01',
  to: '2026-09-04',
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

const INSURANCE_OPTIONS = [
  '전체', '급여1종', '급여2종', '미수입금', '보험', '보호(100/100)', '일반', '환불금',
]

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

export function MedicalReceiptsPage() {
  const [draft, setDraft] = useState(DEFAULT_FILTER)
  const [applied, setApplied] = useState(DEFAULT_FILTER)
  const [extra, setExtra] = useState(DEFAULT_EXTRA_FILTERS)
  const query = useQuery({
    queryKey: ['accounting-medical-mock', applied.from, applied.to],
    queryFn: () => accountingApi.getMedicalReceipts(applied.from, applied.to),
  })
  const rows = useMemo(
    () => filterRows(query.data ?? [], applied, extra),
    [query.data, applied, extra],
  )
  const dataDate = useMemo(
    () => (query.data ?? []).reduce(
      (latest, row) => row.receiptDate > latest ? row.receiptDate : latest,
      '',
    ) || applied.to,
    [query.data, applied.to],
  )

  const search = () => setApplied(draft)
  const reset = () => {
    setDraft(DEFAULT_FILTER)
    setApplied(DEFAULT_FILTER)
    setExtra(DEFAULT_EXTRA_FILTERS)
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
        dataDate={dataDate}
        onChange={setDraft}
        onSearch={search}
        onReset={reset}
        onCsv={() => downloadMedicalCsv(rows)}
      />
      <MedicalReceiptFilters
        value={extra}
        insuranceOptions={INSURANCE_OPTIONS}
        onChange={setExtra}
      />
      {query.isError ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          진료 수납 데이터를 불러오지 못했습니다.
        </div>
      ) : (
        <MedicalReceiptTable rows={rows} breakdown={extra.breakdown} />
      )}
    </div>
  )
}
