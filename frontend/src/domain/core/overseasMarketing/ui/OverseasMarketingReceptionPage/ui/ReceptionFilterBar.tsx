import {
  ChevronDown,
  Download,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
} from 'lucide-react'

import { Button } from '#shared/ui/Button'
import { DateRangePicker } from '#shared/ui/DateRangePicker'

import type {
  OverseasMarketingDateType,
  OverseasMarketingReceptionParams,
} from '../../../type/api'
import {
  createDefaultParams,
  DATE_TYPES,
  MATCH_OPTIONS,
  type MatchFilter,
  STATUS_OPTIONS,
} from '../utils/receptionOptions'

/** 관리자 조작임을 표시하는 페이지 내부 배지 — 사이드바 amber 배지와 톤 통일. */
function AdminBadge() {
  return (
    <span
      className="ml-1 rounded border border-amber-200 bg-amber-50 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-700"
      title="관리자 권한 필요 — 무거운 외부 조회 트리거"
      aria-label="관리자 전용 조작"
    >
      관리자
    </span>
  )
}

interface Props {
  draft: OverseasMarketingReceptionParams
  onDraftChange: (next: OverseasMarketingReceptionParams) => void
  keyword: string
  onKeywordChange: (value: string) => void
  onKeywordApply: () => void
  matchFilter: MatchFilter
  onMatchFilterChange: (value: MatchFilter) => void
  filteredCount: number
  sortedCount: number
  onSearch: () => void
  onReset: () => void
  onAddRow: () => void
  onSheetSync: () => void
  onCrmSync: () => void
  onCsvDownload: () => void
  sheetSyncEnabled: boolean
  crmSyncEnabled: boolean
  crmSyncBusy: boolean
  crmSyncPhase: string
  sheetSyncPending: boolean
  crmSyncPending: boolean
  fetching: boolean
}

export function ReceptionFilterBar(props: Props) {
  const {
    draft,
    onDraftChange,
    keyword,
    onKeywordChange,
    onKeywordApply,
    matchFilter,
    onMatchFilterChange,
    filteredCount,
    sortedCount,
    onSearch,
    onReset,
    onAddRow,
    onSheetSync,
    onCrmSync,
    onCsvDownload,
    sheetSyncEnabled,
    crmSyncEnabled,
    crmSyncBusy,
    crmSyncPhase,
    sheetSyncPending,
    crmSyncPending,
    fetching,
  } = props

  return (
    <div className="overflow-x-auto rounded-md border border-border/70 bg-white shadow-sm">
      <div className="flex h-11 min-w-max items-center gap-1.5 px-2">
        <div className="relative">
          <select
            value={draft.dateType}
            onChange={(event) =>
              onDraftChange({
                ...draft,
                dateType: event.target.value as OverseasMarketingDateType,
              })
            }
            className="h-8 w-[7rem] appearance-none rounded-md border border-border/80 bg-white pl-2.5 pr-8 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            aria-label="조회 기준"
          >
            {DATE_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
        </div>
        <DateRangePicker
          from={draft.from}
          to={draft.to}
          onChange={(range) => onDraftChange({ ...draft, ...range })}
          defaultRange={() => {
            const base = createDefaultParams()
            return { from: base.from, to: base.to }
          }}
        />
        <div className="h-6 w-px bg-border" />
        <div className="relative">
          <select
            value={draft.status}
            onChange={(event) =>
              onDraftChange({ ...draft, status: event.target.value })
            }
            className="h-8 w-[7rem] appearance-none rounded-md border border-border/80 bg-white pl-2.5 pr-8 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            aria-label="상태"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
        </div>
        <div className="relative">
          <select
            value={matchFilter}
            onChange={(event) =>
              onMatchFilterChange(event.target.value as MatchFilter)
            }
            className="h-8 w-[7rem] appearance-none rounded-md border border-border/80 bg-white pl-2.5 pr-8 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            aria-label="매칭구분"
          >
            {MATCH_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
        </div>
        <div className="flex h-8 overflow-hidden rounded-md border border-border/80 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
          <input
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && onSearch()}
            placeholder="이름 · 고객번호 · 국가 · 채널"
            className="w-[14rem] border-0 bg-white px-3 text-xs outline-none placeholder:text-gray-400"
          />
          <button
            type="button"
            onClick={onKeywordApply}
            className="border-l px-2 text-gray-500 hover:bg-gray-50"
            aria-label="결과 내 검색"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex h-8 items-center gap-2 rounded-md border border-border/80 px-3">
          <span className="text-muted-foreground">조회건수</span>
          <strong className="tabular-nums">
            {filteredCount.toLocaleString()}건
          </strong>
        </div>
        <div className="ml-auto h-6 w-px bg-border" />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={onReset}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          초기화
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={onAddRow}
        >
          <Plus className="h-3.5 w-3.5" />행 추가
        </Button>
        {sheetSyncEnabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={sheetSyncPending || crmSyncPending || fetching}
            onClick={onSheetSync}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${sheetSyncPending ? 'animate-spin' : ''}`}
            />
            시트 동기화
            <AdminBadge />
          </Button>
        )}
        {crmSyncEnabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={crmSyncBusy || sheetSyncPending}
            onClick={onCrmSync}
            title={
              crmSyncBusy
                ? `진행 단계: ${crmSyncPhase || '시작 중'}`
                : 'CRM 매칭·상태·검사비·수술비·외래 내역을 갱신합니다. 서버에서 백그라운드로 실행되며 새로 매칭·수정된 행만 다시 조회합니다.'
            }
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${crmSyncBusy ? 'animate-spin' : ''}`}
            />
            {crmSyncBusy ? crmSyncPhase || '동기화 중…' : '동기화'}
            <AdminBadge />
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          disabled={fetching || sheetSyncPending}
          onClick={onSearch}
          className="bg-blue-600 text-xs text-white hover:bg-blue-700"
        >
          <Search className="h-3.5 w-3.5" />
          조회 (F1)
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!sortedCount}
          onClick={onCsvDownload}
          className="bg-emerald-600 text-xs text-white hover:bg-emerald-700"
        >
          <Download className="h-3.5 w-3.5" />
          CSV
        </Button>
      </div>
    </div>
  )
}
