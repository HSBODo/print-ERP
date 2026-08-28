import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { useSmsMutations, useSmsTargets, useSmsTemplates } from '@/hooks/sms/useSmsManagement'
import { TargetFormModal } from './TargetFormModal'
import { SmsStatusFilterBar } from './SmsStatusFilterBar'
import { SmsToolbar, type PeriodMode } from './SmsToolbar'
import { SmsOpTypeHelp } from './SmsOpTypeHelp'
import { SmsTemplateGuideModal } from './SmsTemplateGuideModal'
import { SmsMessagePreview } from './SmsMessagePreview'
import { SmsPagination } from './SmsPagination'
import {
  DELIVERY_GRACE_MINUTES, GROUP_META, OP_TYPE_META, isHeld,
  compareSortValue, getSortValue, groupHelpOf, groupOf, matchesStatusFilter, stampMinutesAgo, offsetOf, targetStateOf, tierCellOf, todayIso, toMonthEnd, toMonthStart, toMonthValue, yesterdayIso,
  type SortState, type StatusFilter,
} from './smsTableModel'
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
  check: '2rem', no: '2.4rem', date: '4.6rem', chart: '4.6rem', name: '3.5rem',
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
  const [basis, setBasis] = useState<SmsQueryBasis>('SURGERY')
  const [tierFilter, setTierFilter] = useState('')
  // 조회에 실제로 쓰인 기준 — 셀렉트를 바꿔도 [조회] 전까지는 목록이 흔들리지 않게 분리한다.
  const [queryBasis, setQueryBasis] = useState<{ basis: SmsQueryBasis; tier: string }>({ basis: 'SURGERY', tier: '' })
  const [periodMode, setPeriodMode] = useState<PeriodMode>('daily')
  const [draft, setDraft] = useState({ from: yesterdayIso(), to: yesterdayIso() })
  const [range, setRange] = useState({ from: yesterdayIso(), to: yesterdayIso() })
  // 화면에 들어오자마자 조회하지 않는다 — [조회]를 눌러야 데이터를 가져온다.
  const [hasSearched, setHasSearched] = useState(false)
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
  /** 오른쪽 미리보기가 보여줄 대상·차수 — 표의 이름이나 차수 날짜를 누르면 정해진다. */
  const [preview, setPreview] = useState<{ targetId: number; tierCode: string | null } | null>(null)

  const { data: targets = [], isLoading, isFetching, isError } = useSmsTargets(
    range.from, range.to, hasSearched, queryBasis.basis, queryBasis.tier || undefined,
  )
  const { data: templates = [] } = useSmsTemplates()
  const { create, update, changeStatus, changeStatusBulk, registerOptOut, lookup } = useSmsMutations()

  const today = todayIso()
  // 한 번 계산해 상태 칸과 차수 칸이 같은 경계를 쓰게 한다 — 따로 계산하면 분이 바뀌는
  // 순간 "상태는 접수인데 1차 칸은 미도달"처럼 갈릴 수 있다.
  const graceFrom = stampMinutesAgo(DELIVERY_GRACE_MINUTES)

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase()
    return targets.filter((t) => {
      // 필터는 묶음으로 건다 — 표시 문구는 '2차 미도달'처럼 세분돼도 탭은 그대로다.
      if (!matchesStatusFilter(targetStateOf(t, templates, today, graceFrom), statusFilter)) return false
      if (groupFilter && groupOf(templates, t.opType)?.code !== groupFilter) return false
      if (!q) return true
      return t.name.toLowerCase().includes(q) || t.chartNo.includes(q) || t.phone.includes(q)
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
    const initial = { from: yesterdayIso(), to: yesterdayIso() }
    setPeriodMode('daily')
    setBasis('SURGERY')
    setTierFilter('')
    setQueryBasis({ basis: 'SURGERY', tier: '' })
    setDraft(initial)
    setRange(initial)
    setHasSearched(false)
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
    <div className="flex h-[calc(100vh-5rem)] min-h-[32rem] flex-col gap-3 overflow-hidden text-xs text-gray-800">
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
        onReset={handleReset}
        onHold={handleHold}
        onOptOut={handleOptOut}
        onAdd={() => setModal({ mode: 'create' })}
        onOpenTemplates={() => setTemplateGuideOpen(true)}
      />
      <SmsStatusFilterBar
        targets={targets}
        templates={templates}
        statusFilter={statusFilter}
        onChange={(v) => { setStatusFilter(v); setCurrentPage(1); setSelected(new Set()) }}
        selectedCount={selected.size}
        groupFilter={groupFilter}
        onGroupChange={(v) => { setGroupFilter(v); setCurrentPage(1); setSelected(new Set()) }}
      />
      {/* ── 본문: 좌 8(대상 표) : 우 2(문구 미리보기) ──
          미리보기는 항상 자리를 차지한다 — 나타났다 사라지면 표 폭이 흔들려 읽기 어렵다. */}
      <div className="flex min-h-0 flex-1 gap-3">
      <Card className="min-h-0 flex-[8] border-border/70 py-0 shadow-sm">
        <CardContent className="flex h-full min-h-0 flex-col px-0">
          {hasSearched && isError ? (
            <div className="flex flex-1 items-center justify-center px-3 text-sm text-red-500">데이터를 불러오지 못했습니다.</div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto rounded-t-lg border-b border-border/60">
              {/* w-full + table-fixed 는 남는 폭을 모든 컬럼에 비례 배분한다 —
                  화면이 넓을수록 컬럼이 통째로 늘어난다. 맨 끝 빈 컬럼이 그 여백을 혼자 먹게 해
                  정한 폭이 그대로 유지되도록 한다. */}
              <table className="w-full min-w-[1270px] table-fixed border-collapse text-[12px]">
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
                        <td className={`${TD} truncate tabular-nums text-gray-500`}>{(safePage - 1) * pageSize + i + 1}</td>
                        <td className={`${TD} truncate tabular-nums`}
                          title={t.rebased ? `수술일 ${t.surgeryDate} · 예정일은 ${t.scheduleBase} 기준으로 다시 깔림(연락처 수정·홀딩 해제)` : t.surgeryDate}>
                          {t.surgeryDate.slice(2)}
                          {t.rebased && <span className="ml-0.5 align-super text-[9px] font-semibold text-blue-600">↻</span>}
                        </td>
                        <td className={`${TD} truncate tabular-nums`}>{t.chartNo}</td>
                        <td className={`${TD} truncate`}>
                          <button
                            type="button"
                            title={`${t.name} — 클릭하면 발송 문구를 봅니다`}
                            className={`w-full truncate text-left font-medium transition-colors hover:text-blue-600 ${
                              preview?.targetId === t.id ? 'text-blue-700' : 'text-gray-900'
                            }`}
                            onClick={() => setPreview({ targetId: t.id, tierCode: null })}
                          >
                            {t.name || '—'}
                          </button>
                        </td>
                        {/* 연락처 클릭 = 수정 팝업(연락처만). 관리 컬럼을 없앤 자리를 대신한다. */}
                        <td className={`${TD} truncate tabular-nums`}>
                          <button
                            type="button"
                            title={t.phoneValid
                              ? `${t.phone} — 클릭하면 연락처를 수정합니다`
                              : '유효한 휴대폰 번호가 아닙니다. 클릭해 직접 고치거나, CRM 에서 고친 뒤 다시 [조회]하세요.'}
                            onClick={() => setModal({ mode: 'edit', target: t })}
                            className={`w-full truncate text-left underline decoration-dotted underline-offset-2 transition-colors hover:text-blue-600 ${
                              t.phoneValid ? 'text-gray-800 decoration-gray-300' : 'text-red-500 decoration-red-300'
                            }`}
                          >
                            {t.phone || '번호 없음'}
                          </button>
                        </td>
                        <td className={`${TD} truncate`} title={t.surgeryType}>
                          {t.surgeryType === '재수술'
                            ? <span className="rounded bg-violet-50 px-1 py-0.5 text-[11px] font-semibold text-violet-700">재수술</span>
                            : (t.surgeryType || '—')}
                        </td>
                        {/* 분류 = 이 사람이 받을 문구·시점. 정확한 시술명은 툴팁에 남긴다. */}
                        <td className={`${TD} truncate`}
                          title={t.opType ? (OP_TYPE_META[t.opType]?.full ?? t.opType) : '수술 종류 미분류'}>
                          {(() => {
                            const group = groupOf(templates, t.opType)
                            if (!group) return <span className="text-gray-300">—</span>
                            return (
                              <span className={`inline-block max-w-full truncate rounded px-1.5 py-0.5 text-[11px] font-semibold ${group.className}`}>
                                {group.label}
                              </span>
                            )
                          })()}
                        </td>
                        <td className={`${TD} truncate`} title={t.surgeryR}>{t.surgeryR || '—'}</td>
                        <td className={`${TD} truncate`} title={t.surgeryL}>{t.surgeryL || '—'}</td>
                        <td className={TD}>
                          {/* 발송 불가는 데이터 문제라 토글 대상이 아니다 — 버튼이 아니라 표시로 둔다. */}
                          {state.locked ? (
                            <span
                              className={`block w-full truncate rounded-full px-1 py-0.5 text-center text-[11px] font-semibold ${state.className}`}
                              title={state.title}
                            >
                              {state.label}
                            </span>
                          ) : (
                            <button
                              type="button"
                              title={`${state.title}\n${held ? '클릭하면 홀딩을 풀어 발송 대기로 되돌립니다' : '클릭하면 발송 홀딩합니다'}`}
                              className={`w-full truncate rounded-full px-1 py-0.5 text-[11px] font-semibold transition-colors ${state.className}`}
                              onClick={() => changeStatus.mutate(
                                { id: t.id, value: held ? 'SENDABLE' : 'HOLD' },
                                { onError: (e) => toast.error('상태 변경 실패', { description: e.message }) },
                              )}
                            >
                              {state.label}
                            </button>
                          )}
                        </td>
                        {templates.map((tpl) => {
                          const cell = tierCellOf(t, offsetOf(tpl, t.opType), tpl.code, today, graceFrom)
                          return (
                            <td key={tpl.code} className={`${TD} truncate text-center tabular-nums`} title={cell.title}>
                              {/* 누르면 오른쪽에 그 차수 문구가 뜬다 — 어떤 문장이 나가는지 여기서 확인한다. */}
                              <button
                                type="button"
                                className={`w-full truncate rounded px-0.5 transition-colors hover:bg-blue-50 ${
                                  isPreviewing(t.id, tpl.code) ? 'bg-blue-100' : ''
                                }`}
                                onClick={() => setPreview({ targetId: t.id, tierCode: tpl.code })}
                              >
                                <span className={cell.className}>
                                  {cell.text}
                                  {/* 오프셋은 행마다 다르다(스마일 +1 · ICL +3 · 라섹 +5) —
                                      머리글에 못 적으니 여기 찍는다. */}
                                  <span className="ml-0.5 text-[10px] font-normal text-gray-400">+{cell.offsetDays}</span>
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

      {/* 발송 템플릿 안내 — 읽기 전용. 실제 문구는 솔라피 설정이 정본이다. */}
      {templateGuideOpen && (
        <SmsTemplateGuideModal templates={templates} onClose={() => setTemplateGuideOpen(false)} />
      )}

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
