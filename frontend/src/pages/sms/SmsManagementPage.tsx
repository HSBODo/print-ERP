import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { useSmsMutations, useSmsTargets, useSmsTemplates } from '@/hooks/sms/useSmsManagement'
import { useSmsOffsets } from '@/hooks/sms/useSmsOffsets'
import { TargetFormModal } from './TargetFormModal'
import { SmsStatusFilterBar } from './SmsStatusFilterBar'
import { SmsToolbar, type PeriodMode } from './SmsToolbar'
import { SmsOffsetGrid } from './SmsOffsetGrid'
import { SmsOpTypeHelp } from './SmsOpTypeHelp'
import { SmsSolapiTemplateModal } from './SmsSolapiTemplateModal'
import { SmsOptOutModal } from './SmsOptOutModal'
import { SmsQueueStatusCard } from './SmsQueueStatusCard'
import { SmsMessagePreview } from './SmsMessagePreview'
import { SmsPagination } from './SmsPagination'
import { formatPhone } from '@/utils/phone'
import {
  DELIVERY_GRACE_MINUTES, GROUP_META, OP_TYPE_META, isHeld,
  compareSortValue, getSortValue, groupHelpOf, groupOf, matchesStatusFilter, stampMinutesAgo, offsetOf, targetStateOf, tierCellOf, todayIso, toMonthEnd, toMonthStart, toMonthValue,
  type SortState, type StatusFilter,
} from './smsTableModel'

/**
 * 오늘 하루 — 화면 로딩·리셋 시 리스트 조회 디폴트.
 *
 * 초기 조회 기준은 SCHEDULED(오늘 나갈 예정) + 오늘 하루 조합이다.
 * 매일 아침 화면을 열자마자 "오늘 나갈 사람"을 확인하는 흐름에 맞춘다.
 * 수술일(SURGERY) 기준으로 오늘을 보면 마트에 아직 안 실린 대상이 많아 빈 리스트가 되지만,
 * 예정일 기준이면 어제 이전에 수술한 사람의 오늘 예정 차수가 잡힌다.
 */
function todayRange(): { from: string; to: string } {
  const today = todayIso()
  return { from: today, to: today }
}
import type { SmsQueryBasis, SmsTarget, SmsTargetRequest } from '@/api/sms'

/**
 * 문자 발송 관리 — 수술 후 안내 1~3차가 **잘 나갔는지 점검**하고, 보내면 안 되는 사람을 막는 화면.
 *
 * ★ 이 화면은 발송하지 않는다. 대상 적재도 발송도 자동화(큐)가 맡는다.
 *   여기서 하는 일은 셋뿐이다 — 조회(점검) · 발송중지/해제 · 연락처 보정.
 *
 * ★ 상태는 두 층으로 나뉜다. 섞으면 "보냈는데 안 갔다"를 못 잡는다.
 *   대상 상태(사람)   발송 대기 → 발송 홀딩(막음) → 발송(보낸 뒤) · 발송 불가(번호 문제)
 *   발송 상태(메시지) 대기(접수됨) → 완료(단말 도달) / 실패
 *   접수 성공은 완료가 아니다. 도달시각은 자동화가 솔라피에 다시 물어 채운다.
 *
 * ★ 보내면 안 되는 사람은 지우지 않고 **홀딩**한다 — 지우면 왜 안 보냈는지가 사라지고,
 *   다음 적재에서 되살아난다. 홀딩을 풀면 지나간 차수는 그 시점 기준으로 다시 깔린다.
 */

const EMPTY_FORM: SmsTargetRequest = {
  chartNo: '', name: '', phone: '', surgeryDate: '', surgeryType: '', opType: '', surgeryR: '', surgeryL: '',
}

/**
 * 컬럼 폭 — table-fixed 로 고정한다. 폭을 안 정하면 값 길이에 따라 표가 출렁이고
 * 컬럼이 화면 밖으로 밀린다. 넘치는 값은 말줄임 + 툴팁으로 처리한다.
 */
const W = {
  check: '2rem', no: '2.4rem', date: '5.8rem', chart: '4.6rem', name: '3.5rem',
  phone: '6.6rem', type: '4.6rem', group: '5.4rem', eye: '7rem', state: '5.6rem',
  tier: '7.2rem',
} as const

/** 정렬 가능한 고정 컬럼 — key 는 getSortValue 가 아는 값이어야 한다. */
const HEAD_COLS = [
  { key: 'no', label: 'No' },
  { key: 'surgeryDate', label: '수술일' },
  { key: 'chartNo', label: '차트' },
  { key: 'name', label: '이름' },
  { key: 'phone', label: '연락처' },
  { key: 'surgeryType', label: '구분' },
  { key: 'group', label: '수술 분류' },
  { key: 'surgeryR', label: '우안' },
  { key: 'surgeryL', label: '좌안' },
  { key: 'state', label: '상태' },
] as const

/** 정렬 방향 표시 — 수술자 리스트와 같은 삼각형 두 개. */
const SortArrows = ({ dir }: { dir: 'asc' | 'desc' | null }) => (
  <span className="flex h-3.5 w-2.5 flex-none flex-col items-center justify-center gap-[1px]" aria-hidden="true">
    <span className={`h-0 w-0 border-x-[3.5px] border-b-[4px] border-x-transparent ${dir === 'asc' ? 'border-b-blue-600' : 'border-b-gray-300'}`} />
    <span className={`h-0 w-0 border-x-[3.5px] border-t-[4px] border-x-transparent ${dir === 'desc' ? 'border-t-blue-600' : 'border-t-gray-300'}`} />
  </span>
)

const TH = 'sticky top-0 z-10 whitespace-nowrap border-b border-border/60 bg-gray-50 px-1.5 py-2 font-semibold'
const TD = 'px-1.5 py-1.5'

export function SmsManagementPage() {
  const [basis, setBasis] = useState<SmsQueryBasis>('SCHEDULED')
  const [tierFilter, setTierFilter] = useState('')
  // 조회에 실제로 쓰인 기준 — 셀렉트를 바꿔도 [조회] 전까지는 목록이 흔들리지 않게 분리한다.
  const [queryBasis, setQueryBasis] = useState<{ basis: SmsQueryBasis; tier: string }>({ basis: 'SCHEDULED', tier: '' })
  const [periodMode, setPeriodMode] = useState<PeriodMode>('daily')
  const [draft, setDraft] = useState(todayRange)
  const [range, setRange] = useState(todayRange)
  // 화면에 들어오자마자 오늘 예정 리스트를 자동 조회한다 — 관리자가 매번 [조회] 안 눌러도 되게.
  const [hasSearched, setHasSearched] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('전체')
  const [sortState, setSortState] = useState<SortState>(null)
  /** 수술 분류 필터 — 빈 문자열이면 전체. 조회한 행을 걸러내는 클라이언트 필터다. */
  const [groupFilter, setGroupFilter] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [modal, setModal] = useState<{ mode: 'create' } | { mode: 'edit'; target: SmsTarget } | null>(null)
  const [pageSize, setPageSize] = useState(50)
  const [currentPage, setCurrentPage] = useState(1)
  // 분류 도움말 위치 — 표가 overflow-auto 라 안쪽에 붙이면 잘린다. 화면 좌표로 띄운다.
  const [groupHelp, setGroupHelp] = useState<{ top: number; left: number } | null>(null)
  const [templateGuideOpen, setTemplateGuideOpen] = useState(false)
  const [optOutModalOpen, setOptOutModalOpen] = useState(false)
  /** 오른쪽 미리보기가 보여줄 대상·차수 — 표의 이름이나 차수 날짜를 누르면 정해진다. */
  const [preview, setPreview] = useState<{ targetId: number; tierCode: string | null } | null>(null)

  const { data: targets = [], isLoading, isFetching, isError, refetch } = useSmsTargets(
    range.from, range.to, hasSearched, queryBasis.basis, queryBasis.tier || undefined,
  )
  const { data: templates = [] } = useSmsTemplates()
  // 차수별 발송 예정 시각 (HH:mm) 을 차수 셀에 붙이려고 로딩. tier-level 이라 모든 그룹 동일 값 —
  // 첫 행에서 tier1Time/tier2Time/tier3Time 을 뽑아 T1/T2/T3 매핑을 만든다. 데이터 없으면 빈 문자열.
  // 서버 TIME 컬럼은 "10:00:00" 로 직렬화돼 초까지 오므로 앞 5자(HH:mm)만 잘라 셀에 붙인다.
  const { data: offsets = [] } = useSmsOffsets()
  const tierTimeMap = useMemo(() => {
    const base = offsets[0]
    const hhmm = (t: string | undefined) => (t ?? '').slice(0, 5)
    return {
      T1: hhmm(base?.tier1Time),
      T2: hhmm(base?.tier2Time),
      T3: hhmm(base?.tier3Time),
    } as Record<string, string>
  }, [offsets])
  // changeStatus (개별 홀딩 토글) 은 상태 셀 클릭 잠금(실수 방지)으로 화면에서 안 씀 —
  // 훅 자체는 useSmsMutations 안에 유지 (관리자 UI 재도입 시 재사용).
  const { create, update, changeStatusBulk, registerOptOut, lookup } = useSmsMutations()

  const today = todayIso()
  // 한 번 계산해 상태 칸과 차수 칸이 같은 경계를 쓰게 한다 — 따로 계산하면 분이 바뀌는
  // 순간 "상태는 접수인데 1차 칸은 미도달"처럼 갈릴 수 있다.
  const graceFrom = stampMinutesAgo(DELIVERY_GRACE_MINUTES)

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    // 하이픈이 섞인 번호 검색(예: 010-1234)도 저장 형식(01012345678) 과 매칭되게 한다.
    const qDigits = q.replace(/\D/g, '')
    return targets.filter((t) => {
      // 필터는 묶음으로 건다 — 표시 문구는 '2차 미도달'처럼 세분돼도 탭은 그대로다.
      if (!matchesStatusFilter(targetStateOf(t, templates, today, graceFrom), statusFilter)) return false
      if (groupFilter && groupOf(templates, t.opType)?.code !== groupFilter) return false
      if (!q) return true
      return t.name.toLowerCase().includes(q)
        || t.chartNo.includes(q)
        || (qDigits.length > 0 && t.phone.includes(qDigits))
    })
  }, [targets, templates, today, graceFrom, keyword, statusFilter, groupFilter])

  /** 정렬은 걸러낸 뒤에 한다 — 화면에 보이는 것만 줄 세우면 되고, 안 보이는 행까지 비교할 이유가 없다. */
  const sortedRows = useMemo(() => {
    if (!sortState) return filtered
    return filtered
      .map((row, index) => ({ row, index }))
      .sort((a, b) => {
        const compared = compareSortValue(
          getSortValue(a.row, sortState.key, a.index, templates, today),
          getSortValue(b.row, sortState.key, b.index, templates, today),
        )
        // 같은 값이면 원래 순서를 지킨다 — 안 그러면 정렬할 때마다 행이 들썩인다.
        if (compared !== 0) return sortState.direction === 'asc' ? compared : -compared
        return a.index - b.index
      })
      .map(({ row }) => row)
  }, [filtered, sortState, templates, today])

  const handleSort = (key: string) => {
    setCurrentPage(1)
    setSelected(new Set())   // 정렬하면 보이는 행이 바뀐다 — 선택을 들고 가면 엉뚱한 행이 홀딩된다
    setSortState((prev) => (
      prev?.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' }
    ))
  }

  const pageMax = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(currentPage, pageMax)
  const visibleRows = useMemo(
    () => sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [sortedRows, safePage, pageSize],
  )
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1
  const rangeEnd = Math.min(safePage * pageSize, filtered.length)

  /**
   * 선택은 **화면에 보이는 행**에만 걸린다.
   * 필터·검색·페이지를 바꾸면 선택을 비운다 — 안 보이는 행이 딸려 홀딩되는 사고를 막는다.
   * 홀딩된 사람도 선택할 수 있어야 한다(해제 대상이라서).
   */
  const selectable = visibleRows
  const allSelected = selectable.length > 0 && selectable.every((t) => selected.has(t.id))

  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) selectable.forEach((t) => next.delete(t.id))
      else selectable.forEach((t) => next.add(t.id))
      return next
    })
  const toggleOne = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  /** 월별이면 그 달의 1일~말일로, 일별이면 고른 날짜 그대로. */
  const resolveRange = () => (
    periodMode === 'monthly'
      ? { from: toMonthStart(toMonthValue(draft.from)), to: toMonthEnd(toMonthValue(draft.from)) }
      : { ...draft }
  )

  const applyRange = () => {
    const next = resolveRange()
    setRange(next)
    setQueryBasis({ basis, tier: tierFilter })
    setHasSearched(true)
    setSelected(new Set())
    setCurrentPage(1)
    return next
  }

  const handleSearch = () => { applyRange() }

  const handlePeriodModeChange = (mode: PeriodMode) => {
    setPeriodMode(mode)
    if (mode === 'monthly') {
      const month = toMonthValue(draft.from)
      setDraft({ from: toMonthStart(month), to: toMonthEnd(month) })
    }
  }

  const handleReset = () => {
    const initial = todayRange()
    setPeriodMode('daily')
    setBasis('SCHEDULED')
    setTierFilter('')
    setQueryBasis({ basis: 'SCHEDULED', tier: '' })
    setDraft(initial)
    setRange(initial)
    // 리셋해도 오늘 예정 자동 조회 상태로 되돌린다 — 초기 로딩과 같은 상태.
    setHasSearched(true)
    setKeyword('')
    setStatusFilter('전체')
    setGroupFilter('')
    setSelected(new Set())
    setPageSize(50)
    setCurrentPage(1)
  }

  const goToPage = (page: number) => {
    setCurrentPage(page)
    setSelected(new Set())
  }

  /**
   * 수신거부 등록 — 홀딩과 달리 **사람 단위**라 다음 수술에도 계속 막힌다.
   * 그만큼 되돌리기 번거로운 조작이라 한 번 확인받는다.
   */
  const handleOptOut = () => {
    const visibleIds = new Set(visibleRows.map((t) => t.id))
    const ids = [...selected].filter((id) => visibleIds.has(id))
    if (ids.length === 0) {
      toast.error('수신거부로 등록할 대상을 선택하세요.')
      return
    }
    const names = targets.filter((t) => ids.includes(t.id)).map((t) => t.name || t.chartNo).join(', ')
    if (!window.confirm(`${names}\n\n이 연락처를 수신거부로 등록합니다.\n앞으로 새 수술이 생겨도 발송되지 않습니다. 계속할까요?`)) return
    registerOptOut.mutate(ids, {
      onSuccess: (n) => {
        setSelected(new Set())
        toast.success(`${n}명을 수신거부로 등록했습니다.`, { description: '선택한 대상은 함께 홀딩됩니다.' })
      },
      onError: (e) => toast.error('수신거부 등록 실패', { description: e.message }),
    })
  }

  const handleHold = (value: 'HOLD' | 'SENDABLE') => {
    // 보이는 행만 대상으로 삼는다 — 필터·페이지를 바꾸면 선택이 비워지지만, 한 번 더 확인한다.
    const visibleIds = new Set(visibleRows.map((t) => t.id))
    const ids = [...selected].filter((id) => visibleIds.has(id))
    if (ids.length === 0) {
      toast.error(value === 'HOLD' ? '발송을 중지할 대상을 선택하세요.' : '홀딩을 해제할 대상을 선택하세요.')
      return
    }
    changeStatusBulk.mutate(
      { targetIds: ids, value },
      {
        onSuccess: (n) => {
          setSelected(new Set())
          toast.success(value === 'HOLD' ? `${n}명을 발송 홀딩했습니다.` : `${n}명의 홀딩을 해제했습니다.`)
        },
        onError: (e) => toast.error('상태 변경 실패', { description: e.message }),
      },
    )
  }

  const handleModalSubmit = (form: SmsTargetRequest) => {
    if (!modal) return
    if (modal.mode === 'create') {
      create.mutate(form, {
        onSuccess: () => {
          toast.success('대상이 추가되었습니다.')
          setModal(null)
          if (!hasSearched) applyRange()
        },
        onError: (e) => toast.error('추가 실패', { description: e.message }),
      })
    } else {
      update.mutate(
        { id: modal.target.id, request: form },
        {
          onSuccess: () => {
            toast.success('대상이 수정되었습니다.')
            setModal(null)
          },
          onError: (e) => toast.error('수정 실패', { description: e.message }),
        },
      )
    }
  }


  // 체크박스 + No·수술일·차트·이름·연락처·구분·수술 분류·우안·좌안·상태 + 차수 N + 여백
  const columnCount = 12 + templates.length
  // 조회 결과가 바뀌어 그 사람이 사라지면 미리보기도 자연히 비운다.
  const previewTarget = preview ? targets.find((t) => t.id === preview.targetId) ?? null : null
  const isPreviewing = (id: number, tierCode: string) =>
    preview?.targetId === id && preview.tierCode === tierCode
  // 첫 조회(데이터가 아직 없을 때)에만 표를 비운다. 갱신 중이라고 이미 보고 있던 행을
  // 통째로 치우면 "나왔다가 사라진다" — 재조회는 툴바의 '갱신 중' 표시로만 알린다.
  const showLoading = hasSearched && isLoading
  const isRefreshing = hasSearched && isFetching && !isLoading

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col gap-3 text-xs text-gray-800">
      <SmsQueueStatusCard />
      <SmsOffsetGrid />
      <SmsToolbar
        basis={basis}
        onBasisChange={setBasis}
        tierFilter={tierFilter}
        onTierFilterChange={setTierFilter}
        templates={templates}
        periodMode={periodMode}
        onPeriodModeChange={handlePeriodModeChange}
        draft={draft}
        onDraftChange={setDraft}
        keyword={keyword}
        onKeywordChange={(v) => { setKeyword(v); setCurrentPage(1); setSelected(new Set()) }}
        resultCount={filtered.length}
        isRefreshing={isRefreshing}
        holdPending={changeStatusBulk.isPending}
        onSearch={handleSearch}
        onRefresh={() => { void refetch() }}
        onReset={handleReset}
        onHold={handleHold}
        onOptOut={handleOptOut}
        onAdd={() => setModal({ mode: 'create' })}
        onOpenTemplates={() => setTemplateGuideOpen(true)}
        onOpenOptOuts={() => setOptOutModalOpen(true)}
      />
      <SmsStatusFilterBar
        templates={templates}
        statusFilter={statusFilter}
        onChange={(v) => { setStatusFilter(v); setCurrentPage(1); setSelected(new Set()) }}
        selectedCount={selected.size}
        groupFilter={groupFilter}
        onGroupChange={(v) => { setGroupFilter(v); setCurrentPage(1); setSelected(new Set()) }}
      />
      {/* ── 본문: 좌 8(대상 표) : 우 2(문구 미리보기) ──
          미리보기는 항상 자리를 차지한다 — 나타났다 사라지면 표 폭이 흔들려 읽기 어렵다.
          카드가 접혔을 땐 flex-1 로 뷰포트 나머지를 다 먹고, 카드가 펼쳐져 페이지 총 높이가
          뷰포트를 넘으면 min-h 만큼은 지키면서 페이지 자체가 세로 스크롤된다. */}
      <div className="flex min-h-[32rem] flex-1 gap-3">
      <Card className="min-h-0 flex-[8] border-border/70 py-0 shadow-sm">
        <CardContent className="flex h-full min-h-0 flex-col px-0">
          {hasSearched && isError ? (
            <div className="flex flex-1 items-center justify-center px-3 text-sm text-red-500">데이터를 불러오지 못했습니다.</div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto rounded-t-lg border-b border-border/60">
              {/* colgroup 폭은 '최소 폭 힌트' 로만 남긴다 — table-fixed 를 뺐기 때문에 셀 콘텐츠가
                  길면 그 컬럼만 넉넉하게 늘어나고 부족한 폭은 오른쪽으로 밀린다.
                  컨테이너의 overflow-auto 가 가로 스크롤을 제공하므로 로우 텍스트를 말줄임(...)
                  으로 자르지 않는다 (2026-09-02 결정 — 담당자가 요청). */}
              <table className="w-full min-w-[1270px] border-collapse text-[12px]">
                <colgroup>
                  <col style={{ width: W.check }} />
                  <col style={{ width: W.no }} />
                  <col style={{ width: W.date }} />
                  <col style={{ width: W.chart }} />
                  <col style={{ width: W.name }} />
                  <col style={{ width: W.phone }} />
                  <col style={{ width: W.type }} />
                  <col style={{ width: W.group }} />
                  <col style={{ width: W.eye }} />
                  <col style={{ width: W.eye }} />
                  <col style={{ width: W.state }} />
                  {templates.map((t) => <col key={t.code} style={{ width: W.tier }} />)}
                  <col />
                </colgroup>
                <thead>
                  <tr className="bg-gray-50 text-[12px] text-gray-700">
                    <th className={`${TH} text-center`}>
                      <input type="checkbox" aria-label="현재 페이지 전체 선택" checked={allSelected} onChange={toggleAll} />
                    </th>
                    {HEAD_COLS.map(({ key, label }) => (
                      <th key={key} className={`${TH} text-left`}
                        aria-sort={sortState?.key === key
                          ? (sortState.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                        <button type="button" onClick={() => handleSort(key)}
                          className="inline-flex w-full items-center gap-1 text-left font-semibold text-gray-700 transition-colors hover:text-blue-700">
                          <span className="truncate">{label}</span>
                          <SortArrows dir={sortState?.key === key ? sortState.direction : null} />
                        </button>
                        {label === '수술 분류' && (
                          <button
                            type="button"
                            aria-label="수술 분류 설명"
                            title="어떤 시술이 어느 분류로 묶이는지 보기"
                            className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-gray-300 align-middle text-[9px] font-bold leading-none text-gray-500 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect()
                              setGroupHelp(groupHelp ? null : { top: rect.bottom + 6, left: rect.left - 8 })
                            }}
                          >
                            ?
                          </button>
                        )}
                      </th>
                    ))}
                    {/* 차수 머리글에는 숫자를 적지 않는다 — 오프셋이 행마다 달라서
                        하나로 쓸 수 없다. 대신 각 칸 안에 그 행의 +N 을 찍는다. */}
                    {templates.map((t) => (
                      <th key={t.code} className={`${TH} text-center`}
                        aria-sort={sortState?.key === t.code
                          ? (sortState.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                        title={`${t.label} — 수술 분류마다 시점이 다릅니다(${t.groups.map((g) => `${GROUP_META[g.groupCode]?.label ?? g.groupLabel} +${g.offsetDays}`).join(' · ')}). 도달하면 진한 검정, 예정일이 지났는데 미발송이면 빨강.`}>
                        <button type="button" onClick={() => handleSort(t.code)}
                          className="inline-flex w-full items-center justify-center gap-1 font-semibold text-gray-700 transition-colors hover:text-blue-700">
                          <span>{t.label.replace('수술 후 안내 ', '')}</span>
                          <SortArrows dir={sortState?.key === t.code ? sortState.direction : null} />
                        </button>
                      </th>
                    ))}
                    <th className={TH} aria-hidden="true" />
                  </tr>
                </thead>
                <tbody>
                  {showLoading && (
                    <tr>
                      <td colSpan={columnCount} className="px-3 py-12 text-center text-sm text-muted-foreground">
                        불러오는 중입니다…
                      </td>
                    </tr>
                  )}
                  {!showLoading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={columnCount} className="px-3 py-12 text-center text-sm text-muted-foreground">
                        {hasSearched
                          ? '이 기간에 수술한 사람이 없습니다. 조회하면 마트의 수술 완료자가 자동으로 등록됩니다.'
                          : '기간을 선택한 뒤 조회 버튼을 눌러주세요.'}
                      </td>
                    </tr>
                  )}
                  {!showLoading && visibleRows.map((t, i) => {
                    const state = targetStateOf(t, templates, today, graceFrom)
                    const held = isHeld(t)
                    return (
                      <tr key={t.id} className={`border-b border-border/40 transition-colors hover:bg-blue-50/40 ${held ? 'bg-amber-50/40 text-gray-400' : ''}`}>
                        <td className={`${TD} text-center`}>
                          <input
                            type="checkbox"
                            aria-label={`${t.name} 선택`}
                            checked={selected.has(t.id)}
                            onChange={() => toggleOne(t.id)}
                          />
                        </td>
                        <td className={`${TD} whitespace-nowrap tabular-nums text-gray-500`}>{(safePage - 1) * pageSize + i + 1}</td>
                        <td className={`${TD} whitespace-nowrap tabular-nums`}
                          title={t.rebased ? `수술일 ${t.surgeryDate} · 예정일은 ${t.scheduleBase} 기준으로 다시 깔림(연락처 수정·홀딩 해제)` : t.surgeryDate}>
                          {t.surgeryDate}
                          {t.rebased && <span className="ml-0.5 align-super text-[9px] font-semibold text-blue-600">↻</span>}
                        </td>
                        <td className={`${TD} whitespace-nowrap tabular-nums`}>{t.chartNo}</td>
                        <td className={`${TD} whitespace-nowrap`}>
                          <button
                            type="button"
                            title={`${t.name} — 클릭하면 발송 문구를 봅니다`}
                            className={`w-full whitespace-nowrap text-left font-medium transition-colors hover:text-blue-600 ${
                              preview?.targetId === t.id ? 'text-blue-700' : 'text-gray-900'
                            }`}
                            onClick={() => setPreview({ targetId: t.id, tierCode: null })}
                          >
                            {t.name || '—'}
                          </button>
                        </td>
                        {/* 연락처 클릭 = 수정 팝업(연락처만). 관리 컬럼을 없앤 자리를 대신한다. */}
                        <td className={`${TD} whitespace-nowrap tabular-nums`}>
                          <button
                            type="button"
                            title={t.phoneValid
                              ? `${formatPhone(t.phone)} — 클릭하면 연락처를 수정합니다`
                              : '유효한 휴대폰 번호가 아닙니다. 클릭해 직접 고치거나, CRM 에서 고친 뒤 다시 [조회]하세요.'}
                            onClick={() => setModal({ mode: 'edit', target: t })}
                            className={`w-full whitespace-nowrap text-left underline decoration-dotted underline-offset-2 transition-colors hover:text-blue-600 ${
                              t.phoneValid ? 'text-gray-800 decoration-gray-300' : 'text-red-500 decoration-red-300'
                            }`}
                          >
                            {formatPhone(t.phone) || '번호 없음'}
                          </button>
                        </td>
                        <td className={`${TD} whitespace-nowrap`} title={t.surgeryType}>
                          {t.surgeryType === '재수술'
                            ? <span className="rounded bg-violet-50 px-1 py-0.5 text-[11px] font-semibold text-violet-700">재수술</span>
                            : (t.surgeryType || '—')}
                        </td>
                        {/* 분류 = 이 사람이 받을 문구·시점. 정확한 시술명은 툴팁에 남긴다. */}
                        <td className={`${TD} whitespace-nowrap`}
                          title={t.opType ? (OP_TYPE_META[t.opType]?.full ?? t.opType) : '수술 종류 미분류'}>
                          {(() => {
                            const group = groupOf(templates, t.opType)
                            if (!group) return <span className="text-gray-300">—</span>
                            return (
                              <span className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold ${group.className}`}>
                                {group.label}
                              </span>
                            )
                          })()}
                        </td>
                        <td className={`${TD} whitespace-nowrap`} title={t.surgeryR}>{t.surgeryR || '—'}</td>
                        <td className={`${TD} whitespace-nowrap`} title={t.surgeryL}>{t.surgeryL || '—'}</td>
                        <td className={TD}>
                          {/*
                           * 상태 셀은 표시 전용 — 개별 클릭 토글은 실수가 잦아 잠갔다.
                           * 홀딩·해제는 툴바 [발송 홀딩]·[홀딩 해제] 로 선택 대상만 일괄 처리한다.
                           * 셀 클릭 대상이 사라져 span 하나로 통일 (locked 여부는 안내 문구로만 구분).
                           */}
                          <span
                            className={`block w-full whitespace-nowrap rounded-full px-1 py-0.5 text-center text-[11px] font-semibold ${state.className}`}
                            title={`${state.title}${state.locked ? '' : '\n(개별 토글 잠금 — 홀딩·해제는 툴바에서 선택 후 일괄 처리)'}`}
                          >
                            {state.label}
                          </span>
                        </td>
                        {templates.map((tpl) => {
                          // ETC(문구 미설정) 대상은 나갈 수 없으므로 차수 셀도 회색 '—' 로 잠근다 —
                          // 예정일이 지나면 빨간 '미발송' 으로 뜨던 오해 신호를 없앤다.
                          if (groupOf(templates, t.opType)?.code === 'ETC') {
                            return (
                              <td key={tpl.code} className={`${TD} whitespace-nowrap text-center text-gray-300`}
                                title="이 수술 종류는 발송 문구가 없어 나가지 않습니다.">
                                —
                              </td>
                            )
                          }
                          const offsetDays = offsetOf(tpl, t.opType)
                          const cell = tierCellOf(t, offsetDays, tpl.code, today, graceFrom, tierTimeMap[tpl.code])
                          // 오프셋(+1·+3·+5) 배지는 오해 소지가 있어 셀에서 뺐다 — 툴팁에 남긴다.
                          // 이제 셀 텍스트가 "MM-dd HH:mm" 이라 시각이 곧 예정일 신호를 대신한다.
                          const tooltip = `${cell.title}${cell.title ? ' · ' : ''}${GROUP_META[groupOf(templates, t.opType)?.code ?? '']?.label ?? ''} +${offsetDays}일`
                          return (
                            <td key={tpl.code} className={`${TD} whitespace-nowrap text-center tabular-nums`} title={tooltip}>
                              {/* 누르면 오른쪽에 그 차수 문구가 뜬다 — 어떤 문장이 나가는지 여기서 확인한다. */}
                              <button
                                type="button"
                                className={`w-full whitespace-nowrap rounded px-0.5 transition-colors hover:bg-blue-50 ${
                                  isPreviewing(t.id, tpl.code) ? 'bg-blue-100' : ''
                                }`}
                                onClick={() => setPreview({ targetId: t.id, tierCode: tpl.code })}
                              >
                                <span className={cell.className}>
                                  {cell.text}
                                  {cell.label && <span className="ml-1 text-[11px] font-normal opacity-70">{cell.label}</span>}
                                </span>
                                {cell.replaced && (
                                  <span className="ml-0.5 align-super text-[9px] font-semibold text-orange-600" title="문자로 대체 발송됨">문</span>
                                )}
                              </button>
                            </td>
                          )
                        })}
                        <td className={TD} />
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <SmsPagination
            total={filtered.length}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            page={safePage}
            pageMax={pageMax}
            pageSize={pageSize}
            onPage={goToPage}
            onPageSize={(size) => { setPageSize(size); goToPage(1) }}
          />        </CardContent>
      </Card>

      {/* 문구 칸은 너무 좁아지면 문장이 세로로 길어져 못 읽는다 — 최소 폭을 지킨다. */}
      <div className="flex min-h-0 min-w-[16rem] flex-[2] flex-col">
        <SmsMessagePreview
          target={previewTarget}
          templates={templates}
          selectedTier={preview?.tierCode ?? null}
          today={today}
        />
      </div>
      </div>

      {groupHelp && <SmsOpTypeHelp at={groupHelp} groups={groupHelpOf(templates)} onClose={() => setGroupHelp(null)} />}

      {/* 알림톡 템플릿 — 솔라피 API 실시간 조회. 검수 상태·이름·본문 노출. */}
      <SmsSolapiTemplateModal open={templateGuideOpen} onClose={() => setTemplateGuideOpen(false)} />

      {/* 수신거부 관리 — 조회·해제. 홀딩은 자동으로 풀지 않음. */}
      <SmsOptOutModal open={optOutModalOpen} onClose={() => setOptOutModalOpen(false)} />

      {modal && (
        <TargetFormModal
          title={modal.mode === 'create'
            ? '발송 대상 추가'
            : `발송대상 수정 — ${modal.target.name || modal.target.chartNo}`}
          mode={modal.mode}
          templates={templates}
          initial={modal.mode === 'create' ? EMPTY_FORM : {
            chartNo: modal.target.chartNo,
            name: modal.target.name,
            phone: modal.target.phone,
            surgeryDate: modal.target.surgeryDate,
            surgeryType: modal.target.surgeryType,
            opType: modal.target.opType,
            surgeryR: modal.target.surgeryR,
            surgeryL: modal.target.surgeryL,
          }}
          pending={create.isPending || update.isPending}
          lookupPending={lookup.isPending}
          onLookup={(chartNo) => lookup.mutateAsync(chartNo)}
          onSubmit={handleModalSubmit}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
