import { Download, Search } from 'lucide-react'

import type { FilterState } from '#shared/hooks/useFilter'
import { Button } from '#shared/ui/Button'
import { Filter } from '#shared/ui/Filter'
import type { DateRange } from '#shared/utils/date'

import { type ReservationStatsResponseMeta } from '../../type/api'
import {
  defaultStatsRange,
  MAX_RANGE_DAYS,
} from '../../utils/reservationStatsDateRange'
import { reservationStatsSourceLabel } from '../../utils/reservationStatsMeta'
import {
  GRANULARITIES,
  type Granularity,
} from '../../utils/reservationStatsSystemData'

/**
 * 예약통계(시력교정·백내장) 공용 툴바 — 조회 기간은 [조회] 때 반영(92일 제한), 조회 단위는 받아온 일자별 값을 다시 묶기만 해서 바로 반영.
 */
interface Props {
  filter: FilterState<{ range: DateRange }>
  isFetching: boolean
  refetch: () => unknown
  granularity: Granularity
  onGranularityChange: (g: Granularity) => void
  onDownloadCsv: () => void
  canDownload: boolean
  onRunDiagnostics?: () => void
  isDiagnosing?: boolean
  canRunDiagnostics?: boolean
  dataMeta?: ReservationStatsResponseMeta
}

export function ReservationStatsToolbar({
  filter,
  isFetching,
  refetch,
  granularity,
  onGranularityChange,
  onDownloadCsv,
  canDownload,
  onRunDiagnostics,
  isDiagnosing,
  canRunDiagnostics,
  dataMeta,
}: Props) {
  const sourceLabel = dataMeta ? reservationStatsSourceLabel(dataMeta) : null
  const sourceTitle = dataMeta
    ? [
        `source=${dataMeta.source}`,
        `period=${dataMeta.period}`,
        dataMeta.schemaVersion ? `schema=${dataMeta.schemaVersion}` : null,
        dataMeta.formulaVersion ? `formula=${dataMeta.formulaVersion}` : null,
        dataMeta.confirmedAt ? `confirmedAt=${dataMeta.confirmedAt}` : null,
        dataMeta.confirmedBy ? `confirmedBy=${dataMeta.confirmedBy}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : undefined

  return (
    <Filter.Root filter={filter} isFetching={isFetching} refetch={refetch}>
      <Filter.Bar>
        {/* 진행 중인 달은 어제까지만 적재돼 있다 — 기본 기간의 종료일이 선택 상한 */}
        <Filter.DateRange
          {...filter.field('range')}
          maxDays={MAX_RANGE_DAYS}
          max={defaultStatsRange().to}
        />
        <Filter.Segment
          value={granularity}
          onChange={onGranularityChange}
          options={GRANULARITIES.map((g) => ({ value: g.key, label: g.label }))}
          ariaLabel="조회 단위"
        />

        {sourceLabel && (
          <span
            className="rounded bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"
            title={sourceTitle}
          >
            {sourceLabel}
          </span>
        )}

        <Filter.Actions>
          {onRunDiagnostics && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canRunDiagnostics || isDiagnosing}
              className="text-xs"
              onClick={onRunDiagnostics}
              title="선택한 달의 확정 스냅샷과 라이브 재조회값을 일자/필드별로 비교합니다."
            >
              <Search className="h-3.5 w-3.5" />
              {isDiagnosing ? '진단 중…' : '진단'}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            disabled={!canDownload}
            className="bg-emerald-600 text-xs text-white hover:bg-emerald-700"
            onClick={onDownloadCsv}
            title="조회 결과 전체를 CSV로 내려받기"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
        </Filter.Actions>
      </Filter.Bar>
    </Filter.Root>
  )
}
