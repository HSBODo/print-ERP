import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { accountingApi } from '@/api/accounting'
import { monthRange } from './accountingPeriod'
import { VisionRevenueSummaryControls, type VisionSummaryFilter } from './VisionRevenueSummaryControls'
import { VisionRevenueSummaryTable } from './VisionRevenueSummaryTable'
import { buildVisionRevenueSummary } from './visionRevenueSummaryModel'
import { downloadVisionRevenueSummaryCsv } from './visionRevenueSummaryCsv'

const AUGUST_2026 = monthRange('2026-08')
const DEFAULT_FILTER: VisionSummaryFilter = {
  mode: 'monthly',
  ...AUGUST_2026,
  status: '전체',
  zeroRows: '표시',
}

export function VisionRevenueSummaryPage() {
  const [draft, setDraft] = useState(DEFAULT_FILTER)
  const [applied, setApplied] = useState(DEFAULT_FILTER)
  const query = useQuery({
    queryKey: ['accounting-vision-summary-mock', applied.from, applied.to],
    queryFn: () => accountingApi.getVisionReceipts(applied.from, applied.to),
  })
  const rows = useMemo(
    () => (query.data ?? []).filter((row) => applied.status === '전체' || row.status === applied.status),
    [query.data, applied.status],
  )
  const summary = useMemo(() => buildVisionRevenueSummary(rows), [rows])
  const dataDate = useMemo(
    () => (query.data ?? []).reduce((latest, row) => row.receiptDate > latest ? row.receiptDate : latest, '') || applied.to,
    [query.data, applied.to],
  )
  const search = () => {
    const normalized = draft.from <= draft.to ? draft : { ...draft, from: draft.to, to: draft.from }
    setDraft(normalized)
    setApplied(normalized)
  }
  const reset = () => {
    setDraft(DEFAULT_FILTER)
    setApplied(DEFAULT_FILTER)
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[560px] flex-col gap-2">
      <VisionRevenueSummaryControls
        value={draft}
        count={summary.count}
        dataDate={dataDate}
        dataRange={`2026-01-02~${dataDate}`}
        onChange={setDraft}
        onSearch={search}
        onReset={reset}
        onCsv={() => downloadVisionRevenueSummaryCsv(summary, applied.from, applied.to)}
      />
      {query.isError ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">시력교정 매출 집계 데이터를 불러오지 못했습니다.</div>
      ) : (
        <VisionRevenueSummaryTable summary={summary} showZeroRows={draft.zeroRows === '표시'} />
      )}
      <p className="px-2 text-[11px] leading-5 text-gray-500">
        <b className="text-gray-700">{applied.from} ~ {applied.to}</b> · 카드는 매입사별, 카드 외 결제(현금·현금영수·통장)는 <b className="text-gray-700">현금</b> 한 칸으로 묶습니다 · 과세는 건기식·영양제 계열만 집계합니다.
      </p>
    </div>
  )
}
