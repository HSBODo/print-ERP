import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, ChevronsUpDown, Download, Pencil, Plus, RefreshCw, RotateCcw, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  overseasMarketingApi,
  type OverseasMarketingDateType,
  type OverseasMarketingReception,
  type OverseasMarketingReceptionInput,
  type OverseasMarketingReceptionParams,
} from '@/api/marketing/overseasMarketing'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import {
  useOverseasMarketingCrmSync,
  useOverseasMarketingMatchConfirm,
  useOverseasMarketingReceptionCreate,
  useOverseasMarketingReceptionDelete,
  useOverseasMarketingReceptions,
  useOverseasMarketingReceptionUpdate,
  useOverseasMarketingSheetSync,
  useOverseasMarketingSyncAvailability,
} from '@/hooks/marketing/useOverseasMarketing'
import { MatchConfirmDialog } from '@/pages/marketing/overseas-marketing/MatchConfirmDialog'
import { ReceptionFormDialog } from '@/pages/marketing/overseas-marketing/ReceptionFormDialog'
import { EMPTY_RECEPTION_INPUT, toReceptionInput } from '@/pages/marketing/overseas-marketing/receptionForm'
import { columnsToCsv, downloadCsv, type CsvColumn } from '@/utils/csv'
import { maskName } from '@/utils/mask'

const pad = (value: number) => String(value).padStart(2, '0')
const toIso = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const today = () => new Date()

// 기본 조회: 문의일 기준 당월 1일 ~ 말일.
const createDefaultParams = (): OverseasMarketingReceptionParams => {
  const now = today()
  return {
    from: toIso(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toIso(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    dateType: 'inquiry_date',
    dateEnabled: true,
    status: '',
    source: 'all',
    unmatched: false,
  }
}

const DATE_TYPES: { value: OverseasMarketingDateType; label: string }[] = [
  { value: 'reg_date', label: '등록일' },
  { value: 'matched_date', label: '매칭일' },
  { value: 'inquiry_date', label: '문의일' },
  { value: 'departure_schedule', label: '출국예정' },
  { value: 'exam_date', label: '검사일' },
  { value: 'surgery_date', label: '수술일' },
]

const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: '__empty__', label: '미분류' },
  { value: '검사예약', label: '검사예약' },
  { value: '외래문의', label: '외래문의' },
  { value: '수술완료', label: '수술완료' },
]

// CRM [동기화] 버튼 스위치 — 잠시 꺼야 할 때 false 로 바꾸고 재배포.
const CRM_SYNC_ENABLED = true

type MatchFilter = 'all' | 'received' | 'matched' | 'review'
const MATCH_OPTIONS: { value: MatchFilter; label: string }[] = [
  { value: 'all', label: '매칭 전체' },
  { value: 'received', label: '접수' },
  { value: 'matched', label: '매칭' },
  { value: 'review', label: '확인필요' },
]

const PAGE_SIZE_OPTIONS = [50, 100, 200]
const dash = (value: string) => value?.trim() || '—'
const alignClass = (align: TableColumn['align']) => {
  if (align === 'left') return 'text-left'
  if (align === 'right') return 'text-right'
  return 'text-center'
}

const STATUS_STYLE: Record<string, string> = {
  검사예약: 'bg-blue-50 text-blue-700',
  수술완료: 'bg-emerald-50 text-emerald-700',
  외래문의: 'bg-violet-50 text-violet-700',
}

function Badge({ text, className }: { text: string; className: string }) {
  return text
    ? <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${className}`}>{text}</span>
    : <span className="text-gray-300">—</span>
}

const maskContact = (value: string) => {
  const digits = value.replace(/\D/g, '')
  return digits.length >= 4 ? `***-****-${digits.slice(-4)}` : ''
}

const maskEmail = (value: string) => {
  const [local, domain] = value.split('@')
  return local && domain ? `${local.slice(0, 1)}***@${domain}` : ''
}

type SortKey = keyof OverseasMarketingReception

// 고객번호 열의 빈 값(배지 행) 묶음 순서 — 매칭 → 확인필요 → 미매칭.
const MATCH_ORDER: Record<string, number> = { matched: 0, review: 1, received: 2 }
const PLAIN_NUMBER = /^-?[\d,]+(\.\d+)?$/

const sortValue = (row: OverseasMarketingReception, key: SortKey) => {
  const value = String(row[key] ?? '').trim()
  return value === '-' ? '' : value
}
type TableColumn = {
  key: SortKey | null
  label: string
  align?: 'left' | 'center' | 'right'
  width: string
}

const COLUMNS: TableColumn[] = [
  { key: null, label: 'No', align: 'right', width: 'w-[54px]' },
  { key: null, label: '관리', width: 'w-[76px]' },
  { key: 'status', label: '상태', width: 'w-[80px]' },
  { key: 'registeredDate', label: '등록일', width: 'w-[100px]' },
  { key: 'matchedDate', label: '매칭일', width: 'w-[100px]' },
  { key: 'inquiryDate', label: '문의일', width: 'w-[100px]' },
  { key: 'customerNo', label: '고객번호', width: 'w-[110px]' },
  { key: 'name', label: '이름', align: 'left', width: 'w-[120px]' },
  { key: 'nationality', label: '국적', width: 'w-[100px]' },
  { key: 'gender', label: '성별', width: 'w-[56px]' },
  { key: 'birthDate', label: '생년월일', width: 'w-[104px]' },
  { key: 'contact', label: '연락처', align: 'left', width: 'w-[140px]' },
  { key: 'email', label: '이메일', align: 'left', width: 'w-[180px]' },
  { key: 'ethnicity', label: '민족', width: 'w-[96px]' },
  { key: 'occupation', label: '직업', align: 'left', width: 'w-[104px]' },
  { key: 'contactLens', label: '콘택트렌즈', width: 'w-[96px]' },
  { key: 'medicalConditions', label: '병력', align: 'left', width: 'w-[160px]' },
  { key: 'medicationAllergy', label: '복용약/알레르기', align: 'left', width: 'w-[160px]' },
  { key: 'departureSchedule', label: '출국예정', width: 'w-[120px]' },
  { key: 'examDate', label: '검사일', width: 'w-[100px]' },
  { key: 'surgeryDate', label: '수술일', width: 'w-[100px]' },
  { key: 'surgeryCost', label: '수술비', align: 'right', width: 'w-[100px]' },
  { key: 'examCost', label: '검사비', align: 'right', width: 'w-[100px]' },
  { key: 'channel', label: '유입경로', width: 'w-[100px]' },
  { key: 'channelId', label: '채널ID', width: 'w-[120px]' },
  { key: 'onlineChannel', label: '온라인채널', width: 'w-[104px]' },
  { key: 'agentChannel', label: '에이전트', width: 'w-[100px]' },
  { key: 'agentId', label: '에이전트ID', width: 'w-[110px]' },
  { key: 'operationRight', label: 'OP_R', width: 'w-[80px]' },
  { key: 'operationLeft', label: 'OP_L', width: 'w-[80px]' },
  { key: 'dreamlens', label: '드림렌즈', width: 'w-[120px]' },
  { key: 'referral', label: '소개', align: 'left', width: 'w-[140px]' },
  { key: 'outpatient1', label: '외래1', align: 'left', width: 'w-[160px]' },
  { key: 'outpatient1Cost', label: '외래1비', align: 'right', width: 'w-[96px]' },
  { key: 'outpatient2', label: '외래2', align: 'left', width: 'w-[160px]' },
  { key: 'outpatient2Cost', label: '외래2비', align: 'right', width: 'w-[96px]' },
  { key: 'outpatient3', label: '외래3', align: 'left', width: 'w-[160px]' },
  { key: 'outpatient3Cost', label: '외래3비', align: 'right', width: 'w-[96px]' },
  { key: 'createdBy', label: '추가자', width: 'w-[110px]' },
  { key: 'modifiedBy', label: '수정자', width: 'w-[100px]' },
  { key: 'remark', label: '비고', align: 'left', width: 'w-[220px]' },
]

const CSV_COLUMNS: CsvColumn<OverseasMarketingReception>[] = COLUMNS.filter((column) => column.label !== '관리').map((column) => {
  if (!column.key) return { key: 'rowNo', label: column.label, csv: (_row, index) => index }
  if (column.key === 'name') return { key: column.key, label: column.label, csv: (row) => maskName(row.name) }
  if (column.key === 'contact') return { key: column.key, label: column.label, csv: (row) => maskContact(row.contact) }
  if (column.key === 'email') return { key: column.key, label: column.label, csv: (row) => maskEmail(row.email) }
  return { key: column.key, label: column.label, text: column.key === 'customerNo' }
})

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

  const renderValue = (row: OverseasMarketingReception, column: TableColumn) => {
    if (column.key === 'status') return <Badge text={row.status} className={STATUS_STYLE[row.status] ?? 'bg-gray-100 text-gray-600'} />
    if (column.key === 'customerNo') {
      // 셀 클릭으로 매칭 확인 팝업을 연다 — 확인필요는 후보 확정, 접수는 수동 입력, 매칭은 변경.
      if (row.matchStatus === 'matched') {
        return <button type="button" onClick={() => setMatchTarget(row)} className="tabular-nums text-blue-700 underline-offset-2 hover:underline" title={`매칭: ${row.matchedBy || 'CRM_Sync'} — 클릭하여 변경`}>{row.customerNo}</button>
      }
      if (row.matchStatus === 'review') {
        return <button type="button" onClick={() => setMatchTarget(row)} className="inline-flex rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800 hover:bg-amber-200" title={row.candidateReason}>확인필요</button>
      }
      return <button type="button" onClick={() => setMatchTarget(row)} className="text-gray-400 underline-offset-2 hover:text-blue-600 hover:underline" title="클릭하여 CRM 고객번호 직접 매칭">미매칭</button>
    }
    const value = column.key ? String(row[column.key] ?? '') : ''
    return <span className="block truncate" title={value}>{dash(value)}</span>
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[34rem] flex-col gap-3 overflow-hidden text-xs text-gray-800">
      <div className="overflow-x-auto rounded-md border border-border/70 bg-white shadow-sm">
        <div className="flex h-11 min-w-max items-center gap-1.5 px-2">
          <div className="relative">
            <select value={draft.dateType} onChange={(event) => setDraft({ ...draft, dateType: event.target.value as OverseasMarketingDateType })} className="h-8 w-[7rem] appearance-none rounded-md border border-border/80 bg-white pl-2.5 pr-8 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" aria-label="조회 기준">
              {DATE_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          </div>
          <DateRangePicker
            from={draft.from}
            to={draft.to}
            onChange={(range) => setDraft({ ...draft, ...range })}
            defaultRange={() => { const base = createDefaultParams(); return { from: base.from, to: base.to } }}
          />
          <div className="h-6 w-px bg-border" />
          <div className="relative">
            <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} className="h-8 w-[7rem] appearance-none rounded-md border border-border/80 bg-white pl-2.5 pr-8 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" aria-label="상태">
              {STATUS_OPTIONS.map((option) => <option key={option.value || 'all'} value={option.value}>{option.label}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          </div>
          <div className="relative">
            <select value={matchFilter} onChange={(event) => { setMatchFilter(event.target.value as MatchFilter); setPage(1) }} className="h-8 w-[7rem] appearance-none rounded-md border border-border/80 bg-white pl-2.5 pr-8 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" aria-label="매칭구분">
              {MATCH_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
          </div>
          <div className="flex h-8 overflow-hidden rounded-md border border-border/80 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100">
            <input value={keyword} onChange={(event) => setKeyword(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && search()} placeholder="이름 · 고객번호 · 국가 · 채널" className="w-[14rem] border-0 bg-white px-3 text-xs outline-none placeholder:text-gray-400" />
            <button type="button" onClick={() => { setAppliedKeyword(keyword); setPage(1) }} className="border-l px-2 text-gray-500 hover:bg-gray-50" aria-label="결과 내 검색"><Search className="h-3.5 w-3.5" /></button>
          </div>
          <div className="flex h-8 items-center gap-2 rounded-md border border-border/80 px-3">
            <span className="text-muted-foreground">조회건수</span><strong className="tabular-nums">{filtered.length.toLocaleString()}건</strong>
          </div>
          <div className="ml-auto h-6 w-px bg-border" />
          <Button type="button" variant="outline" size="sm" className="text-xs" onClick={reset}><RotateCcw className="h-3.5 w-3.5" />초기화</Button>
          <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setEditor({ mode: 'create' })}><Plus className="h-3.5 w-3.5" />행 추가</Button>
          {syncAvailability.data === true && (
            <Button type="button" variant="outline" size="sm" className="text-xs" disabled={sheetSync.isPending || crmSync.isPending || receptions.isFetching} onClick={runSheetSync}><RefreshCw className={`h-3.5 w-3.5 ${sheetSync.isPending ? 'animate-spin' : ''}`} />시트 동기화</Button>
          )}
          {CRM_SYNC_ENABLED && (
            <Button type="button" variant="outline" size="sm" className="text-xs" disabled={crmSyncBusy || sheetSync.isPending} onClick={runCrmSync} title={crmSyncBusy ? `진행 단계: ${crmSyncPhase || '시작 중'}` : 'CRM 매칭·상태·검사비·수술비·외래 내역을 갱신합니다. 서버에서 백그라운드로 실행되며 새로 매칭·수정된 행만 다시 조회합니다.'}><RefreshCw className={`h-3.5 w-3.5 ${crmSyncBusy ? 'animate-spin' : ''}`} />{crmSyncBusy ? (crmSyncPhase || '동기화 중…') : '동기화'}</Button>
          )}
          <Button type="button" size="sm" disabled={receptions.isFetching || sheetSync.isPending} onClick={search} className="bg-blue-600 text-xs text-white hover:bg-blue-700"><Search className="h-3.5 w-3.5" />조회 (F1)</Button>
          <Button type="button" size="sm" disabled={!sorted.length} onClick={() => downloadCsv(`해외마케팅_접수리스트_${query?.from ?? draft.from}_${query?.to ?? draft.to}.csv`, columnsToCsv(CSV_COLUMNS, sorted))} className="bg-emerald-600 text-xs text-white hover:bg-emerald-700"><Download className="h-3.5 w-3.5" />CSV</Button>
        </div>
      </div>

      <Card className="min-h-0 flex-1 border-border/70 py-0 shadow-sm">
        <CardContent className="flex h-full min-h-0 flex-col px-0">
          <div className="min-h-0 flex-1 overflow-auto rounded-t-lg border-b border-border/60">
            <table className="min-w-max table-fixed border-collapse text-[12px]">
              <thead><tr className="bg-gray-50 text-gray-700">
                {COLUMNS.map((column) => {
                  const active = column.key !== null && sort?.key === column.key
                  return <th key={column.label} className={`sticky top-0 z-10 ${column.width} whitespace-nowrap border-b border-border/60 bg-gray-50 px-2 py-2 text-center font-semibold`}>
                    {column.key ? <button type="button" onClick={() => toggleSort(column.key as SortKey)} className={`inline-flex items-center gap-1 hover:text-blue-700 ${active ? 'text-blue-700' : ''}`}>{column.label}{active ? sort?.dir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" /> : <ChevronsUpDown className="h-3 w-3 text-gray-300" />}</button> : column.label}
                  </th>
                })}
              </tr></thead>
              <tbody>
                {receptions.isFetching && <tr><td colSpan={COLUMNS.length} className="py-14 text-center text-sm text-muted-foreground">불러오는 중…</td></tr>}
                {receptions.isError && !receptions.isFetching && <tr><td colSpan={COLUMNS.length} className="py-14 text-center text-sm text-red-500">접수 데이터를 불러오지 못했습니다.</td></tr>}
                {!receptions.isFetching && !receptions.isError && visible.map((row, index) => <tr key={row.rowId} className="border-b border-border/40 hover:bg-blue-50/40">
                  {COLUMNS.map((column, columnIndex) => <td key={column.label} className={`${column.width} truncate whitespace-nowrap px-2 py-1 ${alignClass(column.align)}`}>
                    {columnIndex === 0
                      ? ((safePage - 1) * pageSize + index + 1).toLocaleString()
                      : column.label === '관리'
                        ? <span className="inline-flex items-center gap-0.5">
                            <button type="button" onClick={() => setEditor({ mode: 'edit', row })} className="rounded p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600" title="수정" aria-label={`${row.name} 수정`}><Pencil className="h-3.5 w-3.5" /></button>
                            <button type="button" onClick={() => removeReception(row)} disabled={row.locked || deleteReception.isPending} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400" title={row.locked ? '동기화를 거친 행은 삭제할 수 없습니다' : '삭제'} aria-label={`${row.name} 삭제`}><Trash2 className="h-3.5 w-3.5" /></button>
                          </span>
                        : renderValue(row, column)}
                  </td>)}
                </tr>)}
                {!receptions.isFetching && !receptions.isError && !visible.length && <tr><td colSpan={COLUMNS.length} className="py-14 text-center text-sm text-muted-foreground">{query ? '조회 결과가 없습니다.' : '조회 버튼을 클릭하세요.'}</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 text-xs">
            <span className="min-w-40 font-semibold">{sorted.length.toLocaleString()}건{sorted.length > 0 && ` · ${((safePage - 1) * pageSize + 1).toLocaleString()}-${Math.min(safePage * pageSize, sorted.length).toLocaleString()}`}</span>
            <nav className="flex flex-1 items-center justify-center gap-1" aria-label="페이지 네비게이션">
              <Button type="button" variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>이전</Button>
              <span className="px-2 tabular-nums">{safePage} / {maxPage}</span>
              <Button type="button" variant="outline" size="sm" disabled={safePage >= maxPage} onClick={() => setPage(safePage + 1)}>다음</Button>
            </nav>
            <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }} className="h-8 rounded-md border border-border/80 bg-white px-2 text-xs" aria-label="페이지당 행 수">
              {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}건</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

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
