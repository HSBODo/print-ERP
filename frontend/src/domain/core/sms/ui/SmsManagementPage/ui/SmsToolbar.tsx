import {
  Ban,
  BellOff,
  ChevronDown,
  FileText,
  ListX,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Undo2,
} from 'lucide-react'
import { Button } from '#shared/ui/Button'
import { MonthPicker } from '#shared/ui/MonthPicker'
import { toMonthEnd, toMonthStart, toMonthValue } from '../utils/smsTableModel'
import type { SmsQueryBasis, SmsTemplate } from '../../../type/api'

export type PeriodMode = 'daily' | 'monthly'
export type DateRange = { from: string; to: string }

const INPUT_CLS =
  'h-8 rounded-md border border-border/80 bg-white px-2 text-xs outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100'

/** 수술자 리스트와 같은 셀렉트 스타일 — 기본 화살표를 숨기고 ChevronDown 을 얹는다. */
export function StyledSelect({
  ariaLabel,
  value,
  onChange,
  children,
  className = '',
}: {
  ariaLabel: string
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="relative">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-8 appearance-none rounded-md border border-border/80 bg-white pl-2.5 pr-8 text-xs outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${className}`}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
    </div>
  )
}

/**
 * 조회 조건과 동작 버튼 — 이 화면이 하는 일이 여기 다 있다.
 * 발송·대상 적재 버튼은 없다(자동화가 맡는다). 남은 동작은 조회·홀딩·해제·수동 추가뿐이다.
 */
export function SmsToolbar({
  basis,
  onBasisChange,
  tierFilter,
  onTierFilterChange,
  templates,
  periodMode,
  onPeriodModeChange,
  draft,
  onDraftChange,
  keyword,
  onKeywordChange,
  resultCount,
  isRefreshing,
  holdPending,
  onSearch,
  onRefresh,
  onReset,
  onHold,
  onOptOut,
  onAdd,
  onOpenTemplates,
  onOpenOptOuts,
}: {
  basis: SmsQueryBasis
  onBasisChange: (v: SmsQueryBasis) => void
  tierFilter: string
  onTierFilterChange: (v: string) => void
  templates: SmsTemplate[]
  periodMode: PeriodMode
  onPeriodModeChange: (v: PeriodMode) => void
  draft: DateRange
  onDraftChange: (v: DateRange) => void
  keyword: string
  onKeywordChange: (v: string) => void
  resultCount: number
  isRefreshing: boolean
  holdPending: boolean
  onSearch: () => void
  /** 조회 조건 그대로 다시 서버에서 당겨온다 — 재실행·홀딩 해제 후 큐 상태 즉시 반영용. */
  onRefresh: () => void
  onReset: () => void
  onHold: (value: 'HOLD' | 'SENDABLE') => void
  /** 선택 대상의 번호를 수신거부 목록에 올린다 — 사람 단위라 다음 수술에도 막힌다. */
  onOptOut: () => void
  onAdd: () => void
  onOpenTemplates: () => void
  /** 수신거부 목록 관리 모달 열기 — 조회·해제. */
  onOpenOptOuts: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border/70 bg-white px-1.5 py-1 text-xs shadow-sm">
      <div className="flex flex-wrap items-center gap-1 text-xs text-gray-700">
        {/* 조회 기준 — 같은 기간이라도 묻는 게 다르다.
            수술일: 그날 수술한 사람 · 발송예정일: 그날 나갈 사람(점검) · 실제발송일: 그날 나간 사람 */}
        <StyledSelect
          ariaLabel="조회 기준"
          value={basis}
          onChange={(v) => onBasisChange(v as SmsQueryBasis)}
          className="w-[6.6rem]"
        >
          <option value="SURGERY">수술일</option>
          <option value="SCHEDULED">발송예정일</option>
          <option value="SENT">실제발송일</option>
        </StyledSelect>
        {basis !== 'SURGERY' && (
          <StyledSelect
            ariaLabel="차수"
            value={tierFilter}
            onChange={onTierFilterChange}
            className="w-[5.6rem]"
          >
            <option value="">전체 차수</option>
            {templates.map((t) => (
              <option key={t.code} value={t.code}>
                {t.label.replace('수술 후 안내 ', '')}
              </option>
            ))}
          </StyledSelect>
        )}
        <StyledSelect
          ariaLabel="기간 단위"
          value={periodMode}
          onChange={(v) => onPeriodModeChange(v as PeriodMode)}
          className="w-20"
        >
          <option value="daily">일별</option>
          <option value="monthly">월별</option>
        </StyledSelect>
        {periodMode === 'monthly' ? (
          <MonthPicker
            ariaLabel="수술 기준 월"
            value={toMonthValue(draft.from)}
            onChange={(v) =>
              onDraftChange({ from: toMonthStart(v), to: toMonthEnd(v) })
            }
          />
        ) : (
          <>
            <input
              aria-label="수술 시작일"
              type="date"
              value={draft.from}
              onChange={(e) =>
                onDraftChange({ ...draft, from: e.target.value })
              }
              className={`${INPUT_CLS} w-[8.2rem]`}
            />
            <span className="text-gray-400">~</span>
            <input
              aria-label="수술 종료일"
              type="date"
              value={draft.to}
              onChange={(e) => onDraftChange({ ...draft, to: e.target.value })}
              className={`${INPUT_CLS} w-[8.2rem]`}
            />
          </>
        )}
      </div>

      <div className="flex h-8 overflow-hidden rounded-md border border-border/80 bg-white focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
        <input
          type="text"
          value={keyword}
          onChange={(e) => onKeywordChange(e.target.value)}
          placeholder="고객명 · 차트번호 · 연락처"
          className="h-full w-[12rem] border-0 bg-white px-3 text-xs outline-none placeholder:text-gray-400"
        />
      </div>
      <div
        className="flex h-8 items-center gap-2 rounded-md border border-border/80 bg-white px-3 text-xs"
        aria-live="polite"
      >
        <span className="text-muted-foreground">대상</span>
        <strong className="tabular-nums text-gray-900">
          {resultCount.toLocaleString('ko-KR')}명
        </strong>
      </div>
      {isRefreshing && (
        <span className="flex h-8 items-center gap-1.5 rounded-md bg-blue-50 px-2.5 text-[11px] font-semibold text-blue-600">
          <RefreshCw className="h-3 w-3 animate-spin" />
          갱신 중
        </span>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="현재 조회 조건 그대로 다시 서버에서 당겨옵니다 (큐 재실행·홀딩 해제 후 즉시 반영)"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
          />
          새로고침
        </Button>
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
          size="sm"
          className="bg-blue-600 text-xs text-white hover:bg-blue-700"
          onClick={onSearch}
        >
          <Search className="h-3.5 w-3.5" />
          조회
        </Button>
        {/* 지우지 않고 발송만 막는다 — 왜 안 보냈는지가 남고, 언제든 되돌릴 수 있다. */}
        <Button
          type="button"
          size="sm"
          disabled={holdPending}
          className="bg-amber-500 text-xs text-white hover:bg-amber-600"
          onClick={() => onHold('HOLD')}
          title="선택한 대상을 발송에서 제외합니다(삭제가 아니라 발송 중지)"
        >
          <Ban className="h-3.5 w-3.5" />
          발송중지
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={holdPending}
          className="text-xs"
          onClick={() => onHold('SENDABLE')}
          title="선택한 대상의 발송 중지를 풀어 다시 발송 대기로 되돌립니다"
        >
          <Undo2 className="h-3.5 w-3.5" />
          발송중지 해제
        </Button>
        <Button
          type="button"
          size="sm"
          className="bg-emerald-600 text-xs text-white hover:bg-emerald-700"
          onClick={onAdd}
        >
          <Plus className="h-3.5 w-3.5" />
          대상 추가
        </Button>
        {/* 발송 중지와 다르다 — 발송 중지는 이 수술 건 하나만 막고, 수신거부는 그 사람을 계속 막는다.
            되돌리기 어려운 조작이라 확인을 한 번 받는다. */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={holdPending}
          className="text-xs text-slate-700"
          onClick={onOptOut}
          title="선택한 대상의 연락처를 수신거부 목록에 올립니다. 다음 수술에도 발송되지 않습니다"
        >
          <BellOff className="h-3.5 w-3.5" />
          수신거부
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={onOpenOptOuts}
          title="수신거부 목록 조회·해제 (사람 단위 발송 차단)"
        >
          <ListX className="h-3.5 w-3.5" />
          수신거부 관리
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={onOpenTemplates}
          title="솔라피에서 알림톡 템플릿 검수 상태·본문을 조회합니다(설정된 슬롯만)"
        >
          <FileText className="h-3.5 w-3.5" />
          템플릿
        </Button>
      </div>
    </div>
  )
}
