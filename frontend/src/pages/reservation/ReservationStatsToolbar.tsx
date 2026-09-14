import { RotateCcw, Search, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { reservationStatsSourceLabel, type ReservationStatsResponseMeta } from '@/api/reservation/reservationStatsMeta'
import { GRANULARITIES, type Granularity } from './reservationStatsSystemData'

/**
 * 예약통계시스템 전용 툴바 — 시작일/종료일(초안) + 조회 단위(즉시) + 초기화 / 조회 / CSV.
 * 날짜는 초안(draft)이라 [조회]를 눌러야 적용되고, 조회 단위는 즉시 반영된다(예약자 리스트 패턴과 동일).
 * 백엔드 92일 제한은 페이지에서 validateRange 로 미리 검증.
 */
interface Props {
  draftFrom: string
  draftTo: string
  onDraftFromChange: (from: string) => void
  onDraftToChange: (to: string) => void
  /** date input 의 max 값 (미래 날짜 차단). 페이지가 오늘 날짜를 넘겨준다. */
  maxDate: string
  granularity: Granularity
  onGranularityChange: (g: Granularity) => void
  onSearch: () => void
  onReset: () => void
  onDownloadCsv: () => void
  canDownload: boolean
  onRunDiagnostics?: () => void
  isDiagnosing?: boolean
  canRunDiagnostics?: boolean
  dataMeta?: ReservationStatsResponseMeta
}

export function ReservationStatsToolbar({
  draftFrom,
  draftTo,
  onDraftFromChange,
  onDraftToChange,
  maxDate,
  granularity,
  onGranularityChange,
  onSearch,
  onReset,
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

  const dateInputClass =
    'h-8 rounded border border-input bg-white px-2 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-white px-2 py-1.5 text-xs shadow-sm">
      <div className="flex items-center gap-1.5">
        <span className="text-muted-foreground">조회 기간</span>
        <input
          aria-label="시작일"
          type="date"
          className={dateInputClass}
          value={draftFrom}
          max={draftTo || maxDate}
          onChange={(e) => onDraftFromChange(e.target.value)}
        />
        <span className="text-muted-foreground">~</span>
        <input
          aria-label="종료일"
          type="date"
          className={dateInputClass}
          value={draftTo}
          min={draftFrom || undefined}
          max={maxDate}
          onChange={(e) => onDraftToChange(e.target.value)}
        />
      </div>

      <div className="flex h-8 gap-1 rounded-md bg-gray-100 p-1">
        {GRANULARITIES.map((g) => (
          <button
            key={g.key}
            type="button"
            aria-pressed={granularity === g.key}
            onClick={() => onGranularityChange(g.key)}
            className={`rounded px-3 text-sm font-medium transition-colors ${
              granularity === g.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>

      {sourceLabel && (
        <span
          className="rounded bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"
          title={sourceTitle}
        >
          {sourceLabel}
        </span>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        <Button type="button" variant="outline" size="sm" className="text-xs" onClick={onReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          초기화
        </Button>
        <Button
          type="button"
          size="sm"
          className="bg-blue-600 text-xs text-white hover:bg-blue-700"
          onClick={onSearch}
        >
          <Search className="h-3.5 w-3.5" />
          조회
        </Button>
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
      </div>
    </div>
  )
}
