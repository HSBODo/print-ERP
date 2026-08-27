import { useMemo, useState } from 'react'
import {
  AlertTriangle, Ban, MessageSquare, Plus, RefreshCw, RotateCcw, Search,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * 문자 발송 관리 — 기획서(docs/기획/sms.html) 기반 임시 화면.
 *
 * <b>mock 데이터 전용</b>이라 실제 API 연결이 없고, 필터·홀딩 토글·검색은 화면 안에서만 동작한다.
 * 컬럼·상태·색 규칙은 기획서 4~6장을 축약해 반영했으니 실제 API 연결 시 그대로 매핑하면 된다.
 */

type LogState = 'DELIVERED' | 'SENT' | 'FAILED' | 'PENDING' | 'HOLD_SKIP'
type SmsLog = { state: LogState; date: string; replacement?: boolean; note?: string }

type OpType =
  | 'smilePro' | 'smile' | 'lasek' | 'lasik' | 'presbyond'
  | 'tIcl' | 'icl' | 'tKpl' | 'kpl' | 'viva'
  | 'catMulti' | 'catEdof' | 'catMono'
  | 'reopLens' | 'reopLaser'
  | 'other'

type SmsTarget = {
  id: number
  surgeryDate: string
  chartNo: string
  name: string
  phone: string
  phoneValid: boolean
  surgeryType: '시력교정' | '백내장' | '재수술'
  opType: OpType
  surgeryR: string
  surgeryL: string
  status: 'SENDABLE' | 'HOLD'
  rebased?: boolean
  logs: { T1: SmsLog; T2: SmsLog; T3: SmsLog }
}

const MOCK: SmsTarget[] = [
  {
    id: 1, surgeryDate: '2026-08-20', chartNo: 'A-24501', name: '김민준',
    phone: '01012345678', phoneValid: true, surgeryType: '시력교정', opType: 'smilePro',
    surgeryR: 'SmilePro -3.25 Cyl -0.75', surgeryL: 'SmilePro -3.50 Cyl -0.50',
    status: 'SENDABLE',
    logs: {
      T1: { state: 'DELIVERED', date: '2026-08-27' },
      T2: { state: 'SENT', date: '2026-09-03' },
      T3: { state: 'PENDING', date: '2026-09-10' },
    },
  },
  {
    id: 2, surgeryDate: '2026-08-19', chartNo: 'A-24498', name: '이서연',
    phone: '01023456789', phoneValid: true, surgeryType: '시력교정', opType: 'lasek',
    surgeryR: 'Lasek -2.75', surgeryL: 'Lasek -2.50 Cyl -0.25',
    status: 'SENDABLE',
    logs: {
      T1: { state: 'DELIVERED', date: '2026-08-26', replacement: true },
      T2: { state: 'FAILED', date: '2026-09-02', note: '수신 거부' },
      T3: { state: 'PENDING', date: '2026-09-09' },
    },
  },
  {
    id: 3, surgeryDate: '2026-08-18', chartNo: 'A-24491', name: '박지훈',
    phone: '01000000000', phoneValid: false, surgeryType: '시력교정', opType: 'smile',
    surgeryR: 'Smile -4.00', surgeryL: 'Smile -4.25',
    status: 'SENDABLE',
    logs: {
      T1: { state: 'FAILED', date: '2026-08-25', note: '번호 없음' },
      T2: { state: 'FAILED', date: '2026-09-01', note: '번호 없음' },
      T3: { state: 'FAILED', date: '2026-09-08', note: '번호 없음' },
    },
  },
  {
    id: 4, surgeryDate: '2026-08-17', chartNo: 'A-24487', name: '최수아',
    phone: '01034567890', phoneValid: true, surgeryType: '백내장', opType: 'catMulti',
    surgeryR: 'Multi IOL PanOptix +21.5', surgeryL: 'Multi IOL PanOptix +21.0',
    status: 'SENDABLE',
    logs: {
      T1: { state: 'DELIVERED', date: '2026-08-24' },
      T2: { state: 'DELIVERED', date: '2026-08-31' },
      T3: { state: 'PENDING', date: '2026-09-07' },
    },
  },
  {
    id: 5, surgeryDate: '2026-08-16', chartNo: 'A-24480', name: '정하늘',
    phone: '01045678901', phoneValid: true, surgeryType: '시력교정', opType: 'icl',
    surgeryR: 'ICL -8.50', surgeryL: 'ICL -8.75',
    status: 'HOLD',
    logs: {
      T1: { state: 'HOLD_SKIP', date: '2026-08-23', note: '홀딩' },
      T2: { state: 'HOLD_SKIP', date: '2026-08-30', note: '홀딩' },
      T3: { state: 'HOLD_SKIP', date: '2026-09-06', note: '홀딩' },
    },
  },
  {
    id: 6, surgeryDate: '2026-08-15', chartNo: 'A-24476', name: '한도윤',
    phone: '01056789012', phoneValid: true, surgeryType: '재수술', opType: 'reopLaser',
    surgeryR: 'Re-Op Lasek +0.75', surgeryL: '',
    status: 'SENDABLE', rebased: true,
    logs: {
      T1: { state: 'DELIVERED', date: '2026-08-27' },
      T2: { state: 'SENT', date: '2026-09-03' },
      T3: { state: 'PENDING', date: '2026-09-10' },
    },
  },
  {
    id: 7, surgeryDate: '2026-08-14', chartNo: 'A-24470', name: '오세린',
    phone: '01067890123', phoneValid: true, surgeryType: '시력교정', opType: 'smilePro',
    surgeryR: 'SmilePro -5.25', surgeryL: 'SmilePro -5.00',
    status: 'SENDABLE',
    logs: {
      T1: { state: 'DELIVERED', date: '2026-08-21' },
      T2: { state: 'FAILED', date: '2026-08-28', note: '예정일 경과' },
      T3: { state: 'PENDING', date: '2026-09-04' },
    },
  },
  {
    id: 8, surgeryDate: '2026-08-14', chartNo: 'A-24471', name: '문가온',
    phone: '01078901234', phoneValid: true, surgeryType: '백내장', opType: 'catMono',
    surgeryR: 'Mono IOL +22.0', surgeryL: 'Mono IOL +22.5',
    status: 'SENDABLE',
    logs: {
      T1: { state: 'DELIVERED', date: '2026-08-21' },
      T2: { state: 'DELIVERED', date: '2026-08-28' },
      T3: { state: 'SENT', date: '2026-09-04' },
    },
  },
  {
    id: 9, surgeryDate: '2026-08-13', chartNo: 'A-24465', name: '유예린',
    phone: '01011111111', phoneValid: false, surgeryType: '시력교정', opType: 'presbyond',
    surgeryR: 'Presbyond +0.75', surgeryL: 'Presbyond +1.00',
    status: 'SENDABLE',
    logs: {
      T1: { state: 'FAILED', date: '2026-08-20', note: '번호 없음' },
      T2: { state: 'FAILED', date: '2026-08-27', note: '번호 없음' },
      T3: { state: 'FAILED', date: '2026-09-03', note: '번호 없음' },
    },
  },
  {
    id: 10, surgeryDate: '2026-08-12', chartNo: 'A-24460', name: '강태오',
    phone: '01089012345', phoneValid: true, surgeryType: '시력교정', opType: 'lasik',
    surgeryR: 'Lasik -3.00', surgeryL: 'Lasik -3.25',
    status: 'SENDABLE',
    logs: {
      T1: { state: 'DELIVERED', date: '2026-08-19' },
      T2: { state: 'DELIVERED', date: '2026-08-26' },
      T3: { state: 'DELIVERED', date: '2026-09-02' },
    },
  },
]

const TEMPLATES = [
  { code: 'T1', label: '수술 후 안내 1차', offset: 7 },
  { code: 'T2', label: '수술 후 안내 2차', offset: 14 },
  { code: 'T3', label: '수술 후 안내 3차', offset: 21 },
] as const

// 설정 미완료 예시 — 기획서상 .env 미설정 차수. mock 이라 UI 로만.
const MISSING_TEMPLATES: readonly ('T1' | 'T2' | 'T3')[] = ['T2', 'T3']

// ── 수술 종류 배지: 계열별 색 (기획서 §4 배지 색 = 수술 계열) ──
const OP_TYPE_LABEL: Record<OpType, string> = {
  smilePro: '스마일프로', smile: '스마일', lasek: '라섹', lasik: '라식', presbyond: '프레스비욘드',
  tIcl: 'T-ICL', icl: 'ICL', tKpl: 'T-KPL', kpl: 'KPL', viva: 'VIVA',
  catMulti: '다초점', catEdof: 'EDOF', catMono: '단초점',
  reopLens: '재수술렌즈', reopLaser: '재수술레이저',
  other: '기타',
}

const OP_FAMILY_STYLE: Record<OpType, string> = {
  // 레이저 — 파랑
  smilePro: 'bg-blue-50 text-blue-700', smile: 'bg-blue-50 text-blue-700',
  lasek: 'bg-blue-50 text-blue-700', lasik: 'bg-blue-50 text-blue-700', presbyond: 'bg-blue-50 text-blue-700',
  // 렌즈삽입 — 주황
  tIcl: 'bg-amber-50 text-amber-700', icl: 'bg-amber-50 text-amber-700',
  tKpl: 'bg-amber-50 text-amber-700', kpl: 'bg-amber-50 text-amber-700', viva: 'bg-amber-50 text-amber-700',
  // 백내장 — 보라
  catMulti: 'bg-violet-50 text-violet-700', catEdof: 'bg-violet-50 text-violet-700', catMono: 'bg-violet-50 text-violet-700',
  // 재수술 — 자주
  reopLens: 'bg-fuchsia-50 text-fuchsia-700', reopLaser: 'bg-fuchsia-50 text-fuchsia-700',
  // 기타 — 회색
  other: 'bg-gray-100 text-gray-600',
}

type StatusFilter = 'all' | 'ready' | 'sent' | 'hold' | 'blocked'

const STATUS_LABEL: Record<StatusFilter, string> = {
  all: '전체', ready: '발송 대기', sent: '발송', hold: '발송 홀딩', blocked: '발송 불가',
}

const derivedStatus = (t: SmsTarget): Exclude<StatusFilter, 'all'> => {
  if (!t.phoneValid) return 'blocked'
  if (t.status === 'HOLD') return 'hold'
  const anySent = Object.values(t.logs).some((l) => l.state === 'DELIVERED' || l.state === 'SENT')
  return anySent ? 'sent' : 'ready'
}

// ── 차수 칸 색 규칙 (기획서 §6) ──
const cycleCellClass = (log: SmsLog, isHoldOrBlocked: boolean): string => {
  if (isHoldOrBlocked) return 'text-gray-400 line-through'
  switch (log.state) {
    case 'DELIVERED': return 'text-gray-900 font-semibold'
    case 'SENT':      return 'text-amber-600 font-semibold'
    case 'FAILED':    return 'text-red-600 font-semibold'
    case 'PENDING':   return 'text-gray-400'
    case 'HOLD_SKIP': return 'text-gray-400 line-through'
  }
}

const shortDate = (d?: string) => (d ? d.slice(2).replaceAll('-', '-') : '—')
const monthDay = (d?: string) => (d ? d.slice(5) : '—')

// ── 미리보기 문구 (mock) ──
const previewText = (t: SmsTarget, tpl: (typeof TEMPLATES)[number]) =>
  `[비앤빛안과] ${t.name}님, ${tpl.label} 안내드립니다.\n` +
  `수술일 ${t.surgeryDate} 로부터 ${tpl.offset}일차입니다.\n` +
  `- 우안: ${t.surgeryR || '—'}\n- 좌안: ${t.surgeryL || '—'}\n` +
  `이상반응이 있으시면 병원(02-1234-5678)으로 연락주세요.`

// ─────────────────────────────────────────────────────────────

export function SmsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [previewId, setPreviewId] = useState<number>(1)
  const [previewCycle, setPreviewCycle] = useState<'T1' | 'T2' | 'T3'>('T1')
  const [rows, setRows] = useState<SmsTarget[]>(MOCK)

  const counts = useMemo(() => {
    const c = { all: rows.length, ready: 0, sent: 0, hold: 0, blocked: 0 }
    rows.forEach((r) => { c[derivedStatus(r)] += 1 })
    return c
  }, [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (statusFilter !== 'all' && derivedStatus(r) !== statusFilter) return false
      if (!q) return true
      return (
        r.name.toLowerCase().includes(q) ||
        r.chartNo.toLowerCase().includes(q) ||
        r.phone.includes(q)
      )
    })
  }, [rows, statusFilter, search])

  const previewTarget = rows.find((r) => r.id === previewId) ?? rows[0]

  const toggleRow = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const toggleAll = () => {
    if (filtered.every((r) => selected.has(r.id))) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((r) => r.id)))
    }
  }
  const toggleHold = (id: number) => {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, status: r.status === 'HOLD' ? 'SENDABLE' : 'HOLD' } : r))
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col gap-3 overflow-hidden">
      {/* ── ① 툴바 ── */}
      <Card className="border-border/70 shrink-0 shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-3 py-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">날짜 기준</span>
            <select className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm">
              <option>수술일</option>
              <option>발송 예정일</option>
              <option>실제 발송일</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">차수</span>
            <select className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm">
              <option>전체 차수</option>
              <option>1차</option><option>2차</option><option>3차</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">기간</span>
            <input type="date" defaultValue="2026-08-12" className="rounded-md border border-gray-200 px-2 py-1" />
            <span className="text-gray-400">~</span>
            <input type="date" defaultValue="2026-08-26" className="rounded-md border border-gray-200 px-2 py-1" />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이름 · 차트번호 · 연락처"
              className="w-48 rounded-md border border-gray-200 px-2 py-1"
            />
          </div>
          <div className="text-sm text-gray-500" aria-live="polite">
            대상 <b className="text-gray-900">{filtered.length}</b>명
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm"><RotateCcw className="mr-1 h-3.5 w-3.5" />초기화</Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700"><RefreshCw className="mr-1 h-3.5 w-3.5" />조회</Button>
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600" disabled={selected.size === 0}>
              <Ban className="mr-1 h-3.5 w-3.5" />발송중지
            </Button>
            <Button variant="outline" size="sm" disabled={selected.size === 0}>홀딩 해제</Button>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"><Plus className="mr-1 h-3.5 w-3.5" />대상 추가</Button>
            <Button variant="outline" size="sm"><MessageSquare className="mr-1 h-3.5 w-3.5" />문구 보기</Button>
          </div>
        </CardContent>
      </Card>

      {/* ── ② 상태 필터 바 ── */}
      <Card className="border-border/70 shrink-0 shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-2 py-2.5">
          {(['all', 'ready', 'sent', 'hold', 'blocked'] as StatusFilter[]).map((k) => (
            <button
              key={k}
              onClick={() => setStatusFilter(k)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition',
                statusFilter === k
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
              )}
            >
              {STATUS_LABEL[k]} <span className="ml-1 text-gray-400">{counts[k]}</span>
            </button>
          ))}

          {selected.size > 0 && (
            <span className="ml-3 text-xs text-gray-500">선택 <b className="text-gray-900">{selected.size}</b>명</span>
          )}

          <div className="ml-auto flex items-center gap-1.5 text-xs text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            설정 미완료: {MISSING_TEMPLATES.map((c) => c === 'T1' ? '1차' : c === 'T2' ? '2차' : '3차').join(' · ')}
          </div>
        </CardContent>
      </Card>

      {/* ── ③ 본문 좌(표) + 우(미리보기) ── */}
      <div className="flex min-h-0 flex-1 gap-3">
        {/* 좌 — 대상 표 (flex 7) */}
        <Card className="border-border/70 flex min-w-0 flex-[7] flex-col shadow-sm">
          <CardContent className="min-h-0 flex-1 overflow-auto p-0">
            <table className="min-w-[1190px] table-fixed border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-gray-50 text-gray-500">
                <tr className="border-b">
                  <th className="w-8 px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && filtered.every((r) => selected.has(r.id))}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="w-10 px-2 py-2 text-left">No</th>
                  <th className="w-[4.6rem] px-2 py-2 text-left">수술일</th>
                  <th className="w-[4.6rem] px-2 py-2 text-left">차트</th>
                  <th className="w-14 px-2 py-2 text-left">이름</th>
                  <th className="w-[6.6rem] px-2 py-2 text-left">연락처</th>
                  <th className="w-[4.6rem] px-2 py-2 text-left">구분</th>
                  <th className="w-24 px-2 py-2 text-left">수술 종류</th>
                  <th className="w-28 px-2 py-2 text-left">우안</th>
                  <th className="w-28 px-2 py-2 text-left">좌안</th>
                  <th className="w-[4.8rem] px-2 py-2 text-left">상태</th>
                  <th className="w-[6.4rem] px-2 py-2 text-left">1차 <span className="text-gray-400">+7</span></th>
                  <th className="w-[6.4rem] px-2 py-2 text-left">2차 <span className="text-gray-400">+14</span></th>
                  <th className="w-[6.4rem] px-2 py-2 text-left">3차 <span className="text-gray-400">+21</span></th>
                  <th className="w-auto" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const isHold = r.status === 'HOLD'
                  const isBlocked = !r.phoneValid
                  const isSkip = isHold || isBlocked
                  return (
                    <tr
                      key={r.id}
                      className={cn(
                        'border-b border-gray-100 hover:bg-gray-50',
                        isHold && 'bg-amber-50/60 text-gray-400',
                      )}
                    >
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={selected.has(r.id)}
                          onChange={() => toggleRow(r.id)}
                        />
                      </td>
                      <td className="px-2 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-2 py-2 whitespace-nowrap" title={`기준일 ${r.surgeryDate}`}>
                        {shortDate(r.surgeryDate)}
                        {r.rebased && <sup className="ml-0.5 text-amber-500">↻</sup>}
                      </td>
                      <td className="px-2 py-2">{r.chartNo}</td>
                      <td className="px-2 py-2">
                        <button
                          className="text-blue-700 hover:underline"
                          onClick={() => { setPreviewId(r.id); setPreviewCycle('T1') }}
                        >
                          {r.name}
                        </button>
                      </td>
                      <td className="px-2 py-2">
                        {r.phoneValid ? (
                          <button className="border-dotted border-b border-gray-400 text-gray-700 hover:text-gray-900">
                            {r.phone}
                          </button>
                        ) : (
                          <button className="border-dotted border-b border-red-400 text-red-600 hover:text-red-700">
                            번호 없음
                          </button>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {r.surgeryType === '재수술' ? (
                          <span className="inline-block rounded bg-violet-50 px-1.5 py-0.5 text-[11px] text-violet-700">재수술</span>
                        ) : (
                          <span className="text-gray-600">{r.surgeryType}</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <span className={cn('inline-block rounded px-1.5 py-0.5 text-[11px] font-medium', OP_FAMILY_STYLE[r.opType])}>
                          {OP_TYPE_LABEL[r.opType]}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-gray-600 truncate" title={r.surgeryR}>{r.surgeryR || '—'}</td>
                      <td className="px-2 py-2 text-gray-600 truncate" title={r.surgeryL}>{r.surgeryL || '—'}</td>
                      <td className="px-2 py-2">
                        {isBlocked ? (
                          <span className="inline-block rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                            발송 불가
                          </span>
                        ) : (
                          <button
                            onClick={() => toggleHold(r.id)}
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[11px] font-medium',
                              isHold
                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                            )}
                          >
                            {isHold ? '홀딩' : '대기'}
                          </button>
                        )}
                      </td>
                      {(['T1', 'T2', 'T3'] as const).map((code) => {
                        const log = r.logs[code]
                        return (
                          <td key={code} className="px-2 py-2">
                            <button
                              onClick={() => { setPreviewId(r.id); setPreviewCycle(code) }}
                              className={cn('flex items-baseline gap-1 whitespace-nowrap', cycleCellClass(log, isSkip))}
                              title={log.note ?? ''}
                            >
                              {monthDay(log.date)}
                              {log.replacement && <sup className="text-orange-600">문</sup>}
                            </button>
                          </td>
                        )
                      })}
                      <td />
                    </tr>
                  )
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={15} className="px-4 py-16 text-center text-sm text-gray-500">
                      이 기간에 조건에 맞는 대상이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* 우 — 발송 문구 미리보기 (flex 3) */}
        <Card className="border-border/70 flex min-w-0 flex-[3] flex-col shadow-sm">
          <CardHeader className="shrink-0 border-b py-3">
            <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-gray-900">{previewTarget?.name ?? '—'}</span>
              <span className="text-gray-400">·</span>
              <span className="font-mono text-xs text-gray-500">{previewTarget?.chartNo ?? '—'}</span>
              {previewTarget && (
                <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-medium', OP_FAMILY_STYLE[previewTarget.opType])}>
                  {OP_TYPE_LABEL[previewTarget.opType]}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 space-y-3 overflow-auto py-3">
            {!previewTarget ? (
              <p className="text-sm text-gray-500">표에서 이름이나 차수 날짜를 눌러 문구를 확인하세요.</p>
            ) : (
              TEMPLATES.map((tpl) => (
                <div
                  key={tpl.code}
                  className={cn(
                    'rounded-lg border p-3',
                    previewCycle === tpl.code ? 'border-blue-400 bg-blue-50/40' : 'border-gray-200 bg-white',
                  )}
                >
                  <div className="mb-1.5 flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-semibold text-gray-900">
                      {tpl.code === 'T1' ? '1차' : tpl.code === 'T2' ? '2차' : '3차'}
                    </span>
                    <span>{tpl.label}</span>
                    <span className="text-gray-400">+{tpl.offset}일</span>
                    {MISSING_TEMPLATES.includes(tpl.code) && (
                      <span className="ml-auto rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                        설정 미완료
                      </span>
                    )}
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-xs text-gray-700">
                    {previewText(previewTarget, tpl)}
                  </pre>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
