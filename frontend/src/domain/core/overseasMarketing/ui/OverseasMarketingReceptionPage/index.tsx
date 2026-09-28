import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { overseasMarketingApi } from '../../api'
import type { OverseasMarketingReception, OverseasMarketingReceptionInput, OverseasMarketingReceptionParams } from '../../type/api'
import {
  useOverseasMarketingCrmSync,
  useOverseasMarketingMatchConfirm,
  useOverseasMarketingReceptionCreate,
  useOverseasMarketingReceptionDelete,
  useOverseasMarketingReceptions,
  useOverseasMarketingReceptionUpdate,
  useOverseasMarketingSheetSync,
  useOverseasMarketingSyncAvailability,
} from '../../hooks/useOverseasMarketing'
import { MatchConfirmDialog } from './ui/MatchConfirmDialog'
import { ReceptionFilterBar } from './ui/ReceptionFilterBar'
import { ReceptionFormDialog } from './ui/ReceptionFormDialog'
import { ReceptionTable } from './ui/ReceptionTable'
import { EMPTY_RECEPTION_INPUT, toReceptionInput } from './utils/receptionForm'
import { createDefaultParams, type MatchFilter } from './utils/receptionOptions'
import {
  CSV_COLUMNS,
  MATCH_ORDER,
  PLAIN_NUMBER,
  type SortKey,
  sortValue,
} from './utils/receptionColumns'
import { canSystemOp } from '#domain/support/session/session'
import { useAuthStore } from '#domain/support/session/store'
import { columnsToCsv, downloadCsv } from '#shared/utils/csv'

// CRM [동기화] 버튼 스위치 — 잠시 꺼야 할 때 false 로 바꾸고 재배포.
const CRM_SYNC_ENABLED = true

export function OverseasMarketingReceptionPage() {
  const [draft, setDraft] = useState(createDefaultParams)
  const [query, setQuery] = useState<OverseasMarketingReceptionParams | null>(null)
  const [keyword, setKeyword] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' } | null>(null)

  const [editor, setEditor] = useState<{ mode: 'create' } | { mode: 'edit'; row: OverseasMarketingReception } | null>(null)
  const [matchTarget, setMatchTarget] = useState<OverseasMarketingReception | null>(null)
  const [matchFilter, setMatchFilter] = useState<MatchFilter>('all')
  const [crmSyncBusy, setCrmSyncBusy] = useState(false)
  const [crmSyncPhase, setCrmSyncPhase] = useState('')

  const user = useAuthStore((state) => state.user)
  // 시트·CRM 동기화 버튼은 ADMIN 만 노출. 두 조작 모두 무거운 MSSQL·외부 API 잡을 켜므로
  // 실수 클릭·오·남용 방지를 위해 화면에서부터 잠근다.
  // 백엔드 SecurityConfig 는 아직 MARKETING 부서 전체에 열려 있으니 방어 정책 강화가 필요하면 별도 조치.
  const isAdmin = canSystemOp(user)

  const receptions = useOverseasMarketingReceptions(query ?? draft, query !== null)
  const sheetSync = useOverseasMarketingSheetSync()
  const crmSync = useOverseasMarketingCrmSync()
  const syncAvailability = useOverseasMarketingSyncAvailability()
  const createReception = useOverseasMarketingReceptionCreate()
  const updateReception = useOverseasMarketingReceptionUpdate()
  const deleteReception = useOverseasMarketingReceptionDelete()
  const confirmMatch = useOverseasMarketingMatchConfirm()
  const rows = receptions.data

  const filtered = useMemo(() => {
    const search = appliedKeyword.trim().toLocaleLowerCase('ko-KR')
    const byMatch = matchFilter === 'all'
      ? (rows ?? [])
      : (rows ?? []).filter((row) => row.matchStatus === matchFilter)
    if (!search) return byMatch
    return byMatch.filter((row) => [
      row.customerNo, row.name, row.nationality, row.contact, row.email,
      row.occupation, row.channelId, row.agentChannel, row.agentId,
      row.dreamlens, row.referral, row.remark, row.status,
    ].some((value) => value.toLocaleLowerCase('ko-KR').includes(search)))
  }, [appliedKeyword, matchFilter, rows])

  const sorted = useMemo(() => {
    if (!sort) return filtered
    const { key, dir } = sort
    const factor = dir === 'asc' ? 1 : -1
    return [...filtered].sort((left, right) => {
      const a = sortValue(left, key)
      const b = sortValue(right, key)
      if (!a || !b) {
        // 빈 값(미매칭·미입력)은 방향과 무관하게 항상 뒤로 — 값 있는 행부터 보인다.
        if (!a && !b) {
          return key === 'customerNo'
            ? (MATCH_ORDER[left.matchStatus] ?? 9) - (MATCH_ORDER[right.matchStatus] ?? 9)
            : 0
        }
        return a ? -1 : 1
      }
      // 고객번호·금액(콤마 포함)은 수치로 비교한다 — 문자열 비교는 '999,000' > '1,200,000' 이 된다.
      if (PLAIN_NUMBER.test(a) && PLAIN_NUMBER.test(b)) {
        return (Number(a.replace(/,/g, '')) - Number(b.replace(/,/g, ''))) * factor
      }
      return a.localeCompare(b, 'ko', { numeric: true }) * factor
    })
  }, [filtered, sort])

  const maxPage = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, maxPage)
  const visible = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)

  const search = () => {
    setQuery({ ...draft })
    setAppliedKeyword(keyword)
    setPage(1)
  }

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (event.key === 'F1' && !['INPUT', 'SELECT', 'TEXTAREA'].includes(target?.tagName ?? '')) {
        event.preventDefault()
        search()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  const reset = () => {
    setDraft(createDefaultParams())
    setQuery(null)
    setKeyword('')
    setAppliedKeyword('')
    setMatchFilter('all')
    setPage(1)
    setPageSize(50)
    setSort(null)
  }

  const runSheetSync = async () => {
    if (!window.confirm('Google Sheet의 최근 신규 접수를 일괄 업데이트할까요?')) return
    try {
      const result = await sheetSync.mutateAsync()
      toast.success(result.message)
      if (query) await receptions.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Google Sheet 동기화에 실패했습니다.')
    }
  }

  // 동기화는 서버 백그라운드 잡 — 여기서는 시작만 하고 상태를 폴링한다.
  // 페이지를 닫아도 잡은 서버에서 계속 돌고, 다시 열어 버튼을 누르면 진행 중 상태에 다시 붙는다.
  const runCrmSync = async () => {
    if (crmSyncBusy) return
    if (!window.confirm('CRM 매칭·상태·비용을 갱신할까요? 완료까지 화면 우측 상단 알림으로 안내됩니다.')) return
    setCrmSyncBusy(true)
    try {
      let status = await crmSync.mutateAsync()
      const deadline = Date.now() + 15 * 60_000
      while (status.state === 'running' && Date.now() < deadline) {
        setCrmSyncPhase(status.phase ?? '진행 중')
        await new Promise((resolve) => setTimeout(resolve, 3000))
        status = await overseasMarketingApi.getCrmSyncStatus()
      }
      if (status.state === 'done') {
        toast.success(status.message ?? 'CRM 동기화 완료')
        if (query) await receptions.refetch()
      } else if (status.state === 'error') {
        toast.error(status.message ?? 'CRM 동기화에 실패했습니다.')
      } else {
        toast.info('동기화가 아직 진행 중입니다 — 잠시 후 조회를 다시 실행해 주세요.')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'CRM 동기화에 실패했습니다.')
    } finally {
      setCrmSyncBusy(false)
      setCrmSyncPhase('')
    }
  }

  const saveReception = async (input: OverseasMarketingReceptionInput) => {
    try {
      if (editor?.mode === 'edit') {
        if (editor.row.seq == null) throw new Error('행 번호를 확인할 수 없습니다.')
        await updateReception.mutateAsync({ rowNumber: editor.row.seq, input })
        toast.success('접수 행을 수정했습니다.')
      } else {
        await createReception.mutateAsync(input)
        toast.success('접수 행을 추가했습니다.')
      }
      setEditor(null)
      if (query) await receptions.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '저장에 실패했습니다.')
    }
  }

  const removeReception = async (row: OverseasMarketingReception) => {
    if (row.locked || row.seq == null) return
    if (!window.confirm(`'${row.name}' 접수 행을 삭제할까요?`)) return
    try {
      await deleteReception.mutateAsync(row.seq)
      toast.success('접수 행을 삭제했습니다.')
      if (query) await receptions.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '삭제에 실패했습니다.')
    }
  }

  const submitMatch = async (customerNo: string) => {
    if (!matchTarget || matchTarget.seq == null) return
    try {
      const result = await confirmMatch.mutateAsync({ rowNumber: matchTarget.seq, customerNo })
      toast.success(`'${matchTarget.name}' → CRM ${result.customerNo}(${result.customerName}) 매칭 완료`)
      setMatchTarget(null)
      if (query) await receptions.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '매칭 저장에 실패했습니다.')
    }
  }

  const toggleSort = (key: SortKey) => {
    setSort((current) => {
      if (!current || current.key !== key) return { key, dir: 'asc' }
      return current.dir === 'asc' ? { key, dir: 'desc' } : null
    })
    setPage(1)
  }

  const downloadResults = () => downloadCsv(
    `해외마케팅_접수리스트_${query?.from ?? draft.from}_${query?.to ?? draft.to}.csv`,
    columnsToCsv(CSV_COLUMNS, sorted),
  )

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[34rem] flex-col gap-3 overflow-hidden text-xs text-gray-800">
      <ReceptionFilterBar
        draft={draft}
        onDraftChange={setDraft}
        keyword={keyword}
        onKeywordChange={setKeyword}
        onKeywordApply={() => { setAppliedKeyword(keyword); setPage(1) }}
        matchFilter={matchFilter}
        onMatchFilterChange={(value) => { setMatchFilter(value); setPage(1) }}
        filteredCount={filtered.length}
        sortedCount={sorted.length}
        onSearch={search}
        onReset={reset}
        onAddRow={() => setEditor({ mode: 'create' })}
        onSheetSync={runSheetSync}
        onCrmSync={runCrmSync}
        onCsvDownload={downloadResults}
        sheetSyncEnabled={isAdmin && syncAvailability.data === true}
        crmSyncEnabled={isAdmin && CRM_SYNC_ENABLED}
        crmSyncBusy={crmSyncBusy}
        crmSyncPhase={crmSyncPhase}
        sheetSyncPending={sheetSync.isPending}
        crmSyncPending={crmSync.isPending}
        fetching={receptions.isFetching}
      />

      <ReceptionTable
        visible={visible}
        totalCount={sorted.length}
        page={safePage}
        pageSize={pageSize}
        maxPage={maxPage}
        sort={sort}
        onToggleSort={toggleSort}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
        onEdit={(row) => setEditor({ mode: 'edit', row })}
        onDelete={removeReception}
        onOpenMatch={setMatchTarget}
        deletePending={deleteReception.isPending}
        fetching={receptions.isFetching}
        isError={receptions.isError}
        hasQuery={query !== null}
      />

      {matchTarget && (
        <MatchConfirmDialog
          key={matchTarget.rowId}
          row={matchTarget}
          pending={confirmMatch.isPending}
          onSubmit={submitMatch}
          onClose={() => setMatchTarget(null)}
        />
      )}

      {editor && (
        <ReceptionFormDialog
          key={editor.mode === 'edit' ? editor.row.rowId : 'create'}
          title={editor.mode === 'edit' ? `접수 행 수정 — ${editor.row.name}` : '접수 행 추가'}
          initial={editor.mode === 'edit' ? toReceptionInput(editor.row) : EMPTY_RECEPTION_INPUT}
          pending={createReception.isPending || updateReception.isPending}
          onSubmit={saveReception}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  )
}
