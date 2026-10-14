import {
  Ban,
  BellOff,
  FileText,
  ListX,
  Plus,
  RefreshCw,
  Undo2,
} from 'lucide-react'

import type { FilterState } from '#shared/hooks/useFilter'
import { Button } from '#shared/ui/Button'
import { Filter } from '#shared/ui/Filter'
import type { DateRange } from '#shared/utils/date'

import type { SmsQueryBasis, SmsTemplate } from '../../../type/api'

/** 서버 조회 조건 — [조회] 때 반영 */
export interface SmsQueryFilter {
  basis: SmsQueryBasis
  tier: string
  range: DateRange
}

const BASIS_OPTIONS: { value: SmsQueryBasis; label: string }[] = [
  { value: 'SURGERY', label: '수술일' },
  { value: 'SCHEDULED', label: '발송예정일' },
  { value: 'SENT', label: '실제발송일' },
]

/**
 * 조회 조건과 동작 버튼 — 이 화면이 하는 일이 여기 다 있다.
 * 발송·대상 적재 버튼은 없다(자동화가 맡는다). 남은 동작은 조회·홀딩·해제·수동 추가뿐이다.
 */
export function SmsToolbar({
  filter,
  isFetching,
  refetch,
  templates,
  keyword,
  onKeywordChange,
  resultCount,
  isRefreshing,
  holdPending,
  onRefresh,
  onHold,
  onOptOut,
  onAdd,
  onOpenTemplates,
  onOpenOptOuts,
}: {
  filter: FilterState<SmsQueryFilter>
  isFetching: boolean
  refetch: () => unknown
  templates: SmsTemplate[]
  /** 받아온 대상을 화면에서 거르는 검색어 — 바로 반영 */
  keyword: string
  onKeywordChange: (v: string) => void
  resultCount: number
  isRefreshing: boolean
  holdPending: boolean
  /** 조회 조건 그대로 다시 서버에서 당겨온다 — 재실행·홀딩 해제 후 큐 상태 즉시 반영용. */
  onRefresh: () => void
  onHold: (value: 'HOLD' | 'SENDABLE') => void
  /** 선택 대상의 번호를 수신거부 목록에 올린다 — 사람 단위라 다음 수술에도 막힌다. */
  onOptOut: () => void
  onAdd: () => void
  onOpenTemplates: () => void
  /** 수신거부 목록 관리 모달 열기 — 조회·해제. */
  onOpenOptOuts: () => void
}) {
  const { basis } = filter.draft
  const tierOptions = [
    { value: '', label: '전체 차수' },
    ...templates.map((t) => ({
      value: t.code,
      label: t.label.replace('수술 후 안내 ', ''),
    })),
  ]

  return (
    <Filter.Root filter={filter} isFetching={isFetching} refetch={refetch}>
      <Filter.Bar>
        {/* 조회 기준 — 같은 기간이라도 묻는 게 다르다.
            수술일: 그날 수술한 사람 · 발송예정일: 그날 나갈 사람(점검) · 실제발송일: 그날 나간 사람 */}
        <Filter.Select
          value={basis}
          // 수술일 기준엔 차수가 없다 — 숨기면서 고른 차수도 비워야 요청에 남지 않는다.
          onChange={(next) =>
            filter.setDraft(
              next === 'SURGERY' ? { basis: next, tier: '' } : { basis: next },
            )
          }
          options={BASIS_OPTIONS}
          ariaLabel="조회 기준"
          className="w-[6.6rem]"
        />
        {basis !== 'SURGERY' && (
          <Filter.Select
            {...filter.field('tier')}
            options={tierOptions}
            ariaLabel="차수"
            className="w-[5.6rem]"
          />
        )}
        <Filter.DateRange {...filter.field('range')} ariaLabel="조회 기간" />
        <Filter.Keyword
          value={keyword}
          onChange={onKeywordChange}
          placeholder="고객명 · 차트번호 · 연락처"
          className="w-[12rem]"
        />
        <Filter.Count value={resultCount} label="대상" unit="명" />
        {isRefreshing && (
          <span className="flex h-8 items-center gap-1.5 rounded-md bg-blue-50 px-2.5 text-[11px] font-semibold text-blue-600">
            <RefreshCw className="h-3 w-3 animate-spin" />
            갱신 중
          </span>
        )}

        <Filter.Actions>
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
        </Filter.Actions>
      </Filter.Bar>
    </Filter.Root>
  )
}
