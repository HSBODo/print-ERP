import { useMemo, useState } from 'react'

import { useFilter } from '#shared/hooks/useFilter'
import { Filter } from '#shared/ui/Filter'
import { thisMonthRange } from '#shared/utils/date'

import {
  useAccountingStatus,
  useVisionReceipts,
} from '../../hooks/useAccounting'
import { dataStamp } from '../../utils/accountingModel'
import {
  AccountingFilterBar,
  validateAccountingRange,
} from '../AccountingFilterBar'
import { downloadVisionRevenueSummaryCsv } from './visionRevenueSummaryCsv'
import { buildVisionRevenueSummary } from './visionRevenueSummaryModel'
import { VisionRevenueSummaryTable } from './VisionRevenueSummaryTable'

type Status = '전체' | '결제처리' | '결제취소'
type ZeroRows = '표시' | '숨김'
const STATUS_OPTIONS: readonly Status[] = ['전체', '결제처리', '결제취소']
const ZERO_ROW_OPTIONS: readonly ZeroRows[] = ['표시', '숨김']
const ALL_STATUS: Status = '전체'
const SHOW_ZERO: ZeroRows = '표시'

/**
 * 시력교정 매출 집계 — 한울회계법인 제공 피벗(매입사 × 진료명) 재현.
 * 마트가 2023 부터 행으로 있으므로 어느 달이든 같은 행 경로로 접는다 (원형의 '집계 전용 연도' 분기 없음).
 * 진입·초기화 = 이번 달로 바로 조회. 수납 기간만 [조회] 때 반영되고, 상태·0원 행은 받아온 행에 바로 적용한다.
 */
export function VisionRevenueSummaryPage() {
  const filter = useFilter({
    defaults: () => ({ range: thisMonthRange() }),
    validate: validateAccountingRange,
    onReset: () => {
      setStatusFilter(ALL_STATUS)
      setZeroRows(SHOW_ZERO)
    },
  })
  const { range } = filter.applied
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS)
  const [zeroRows, setZeroRows] = useState(SHOW_ZERO)
  const query = useVisionReceipts(range)
  const status = useAccountingStatus()
  const rows = useMemo(
    () =>
      (query.data ?? []).filter(
        (row) => statusFilter === '전체' || row.status === statusFilter,
      ),
    [query.data, statusFilter],
  )
  const summary = useMemo(() => buildVisionRevenueSummary(rows), [rows])
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
        onCsv={() =>
          downloadVisionRevenueSummaryCsv(summary, range.from, range.to)
        }
      >
        <span className="whitespace-nowrap text-[11px] text-gray-500">
          상태
        </span>
        <Filter.Segment
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUS_OPTIONS}
          ariaLabel="상태"
        />
        <span className="whitespace-nowrap pl-1 text-[11px] text-gray-500">
          0원 행
        </span>
        <Filter.Segment
          value={zeroRows}
          onChange={setZeroRows}
          options={ZERO_ROW_OPTIONS}
          ariaLabel="0원 행"
        />
        <Filter.Count value={summary.count} label="건수" />
      </AccountingFilterBar>
      {query.isError ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          시력교정 매출 집계 데이터를 불러오지 못했습니다.
        </div>
      ) : (
        <VisionRevenueSummaryTable
          summary={summary}
          showZeroRows={zeroRows === '표시'}
        />
      )}
      <p className="px-2 text-[11px] leading-5 text-gray-500">
        <b className="text-gray-700">
          {range.from} ~ {range.to}
        </b>{' '}
        · 카드는 매입사별, 카드 외 결제(현금·현금영수·통장)는{' '}
        <b className="text-gray-700">현금</b> 한 칸으로 묶습니다 · 과세는
        건기식·영양제 계열만 집계합니다.
      </p>
    </div>
  )
}
