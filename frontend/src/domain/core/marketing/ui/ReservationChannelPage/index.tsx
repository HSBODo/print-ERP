import {
  ChevronDown,
  ChevronsUpDown,
  ChevronUp,
  RotateCcw,
  Search,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '#shared/ui/Button'
import { MonthPicker } from '#shared/ui/MonthPicker'
import { PanelShell } from '#shared/ui/PanelShell'

import {
  useReservationChannel,
  useReservationChannelOpTypes,
} from '../../hooks/useReservationChannel'
import type { ReservationChannelFunnelItem } from '../../type/api'

/**
 * 예약통계_채널별 — 예약자 리스트를 채널로 묶어 단계별로 좁혀 보는 화면.
 *
 * 단계는 예약자 리스트에서 차례로 걸러낸 것이다.
 *   예약 → 취소 제외 → 접수(내원) → 검사 → 중단 제외 → 수술등록 → 수술완료 → 재수술
 *
 * ★ 수술대기( = 수술등록 − 수술완료 )는 **칸으로는 보여주되 퍼널 밴드에는 넣지 않는다**.
 *   대기와 완료는 형제라 밴드에 끼우면 735 → 156 → 579 로 줄었다 늘어 퍼널이 거짓말을 한다.
 *   그래서 그리는 목록이 둘이다:
 *     STAGES  퍼널 밴드 8단계 (예약 … 수술등록 → 수술완료 → 재수술)
 *     COLS    카드·표 9칸 (STAGES + 수술대기를 **수술완료 뒤**에 끼움)
 *
 *   ⚠️ 대기는 완료 **뒤**다. 등록과 완료 사이에 두면 "대기를 거쳐 완료로 간다"로 읽히는데,
 *      대기와 완료는 서로 배타다(완료한 사람은 대기에 없다). 게다가 완료한 사람도 전부
 *      대기를 거쳤으니 시간 순서로도 틀리다 — 대기는 오늘 기준 아직 안 한 사람의 스냅샷이다.
 *      완료 뒤에 두면 숫자도 735 → 579 → 156 으로 계속 줄어 퍼널처럼 읽힌다.
 *   대기는 이탈이 아니므로 빨강을 쓰지 않고 노랑·점선으로 파생 칸임을 드러낸다.
 *
 * ★ 이 화면은 **사람 수만** 센다(건수 아님).
 *   같은 사람이 취소 후 다시 잡아도 1명이다. 실제 몇 명이 왔는지가 알고 싶은 값이라서다.
 *   식별은 휴대폰 > 이메일 > 차트번호 > 이름 순(v_reservation_channel.person, 커버리지 99.9%).
 *   API 는 건수도 같이 주지만 화면에서는 쓰지 않는다 — 숫자가 두 벌이면 읽기 어렵다.
 *
 * 채널 판정은 v_reservation_channel 이 한다(내원동기 매체명 > 직원 설정표 > 예약경로).
 * 화면은 판정을 하지 않는다 — 규칙을 바꾸려면 뷰만 고치면 된다.
 */

/* ── 단계 정의 ── 순서가 곧 퍼널 순서다.
 * personKey  채널별 사람 수
 * totalKey   전체(채널 무관) 사람 수 — 합계행 전용.
 *            채널별 값을 더하면 안 된다: 한 사람이 두 채널로 예약하면 채널마다 1명씩 세어진다. */
type PersonKey = keyof Pick<
  ReservationChannelFunnelItem,
  | 'reservedPersons'
  | 'notCancelPersons'
  | 'visitedPersons'
  | 'examinedPersons'
  | 'notStopPersons'
  | 'surgeryPersons'
  | 'surgeryDonePersons'
  | 'reopPersons'
>
type TotalKey = keyof Pick<
  ReservationChannelFunnelItem,
  | 'totalReservedPersons'
  | 'totalNotCancelPersons'
  | 'totalVisitedPersons'
  | 'totalExaminedPersons'
  | 'totalNotStopPersons'
  | 'totalSurgeryPersons'
  | 'totalSurgeryDonePersons'
  | 'totalReopPersons'
>

const STAGES: {
  personKey: PersonKey
  totalKey: TotalKey
  label: string
  hint: string
  color: string
}[] = [
  {
    personKey: 'reservedPersons',
    totalKey: 'totalReservedPersons',
    label: '예약',
    hint: '등록일 기준 예약한 사람',
    color: '#1e3a8a',
  },
  {
    personKey: 'notCancelPersons',
    totalKey: 'totalNotCancelPersons',
    label: '취소 제외',
    hint: '예약을 취소하지 않은 사람',
    color: '#2563eb',
  },
  {
    personKey: 'visitedPersons',
    totalKey: 'totalVisitedPersons',
    label: '접수',
    hint: '미내원까지 빼고 실제 내원한 사람',
    color: '#0ea5e9',
  },
  {
    personKey: 'examinedPersons',
    totalKey: 'totalExaminedPersons',
    label: '검사',
    hint: '검사등록일이 있는 사람',
    color: '#10b981',
  },
  {
    personKey: 'notStopPersons',
    totalKey: 'totalNotStopPersons',
    label: '중단 제외',
    hint: '검사 후 중단(검사중단=Y)하지 않은 사람 — 중단하면 수술로 가지 않는다',
    color: '#14b8a6',
  },
  {
    personKey: 'surgeryPersons',
    totalKey: 'totalSurgeryPersons',
    label: '수술등록',
    hint: '수술예약을 등록한 사람 — 수술한 날이 아니다',
    color: '#f59e0b',
  },
  {
    personKey: 'surgeryDonePersons',
    totalKey: 'totalSurgeryDonePersons',
    label: '수술완료',
    hint: '실제 수술일이 있는 사람. 수술등록과의 차이가 수술 대기 인원이다',
    color: '#f97316',
  },
  {
    personKey: 'reopPersons',
    totalKey: 'totalReopPersons',
    label: '재수술',
    hint: '수술 후 재수술까지 간 사람(코호트 기준) — 재수술은 몇 달~몇 년 뒤라 최근 달일수록 0 이다',
    color: '#dc2626',
  },
]

/** 수술등록 → 수술완료 구간. 이 사이의 이탈은 "빠져나간 사람"이 아니라 **수술 대기**다.
 *  다른 구간과 같은 말로 부르면 오해를 부르므로 화면에서 따로 이름을 붙인다. */
const WAIT_GAP_INDEX = 5
/** 수술완료 → 재수술 구간. 여기서 '줄어든 수'는 의미가 없다 —
 *  완료 579명 중 재수술이 0명이면 그건 −579 가 아니라 재수술 0 이다.
 *  게다가 이 구간은 적을수록 좋아서 빨간 이탈로 칠하면 정반대로 읽힌다. */
const REOP_GAP_INDEX = 6
/** '최종 전환' 의 기준 단계 = 수술등록. 재수술까지 세면 0 이라 최종 전환이 될 수 없다. */
const FINAL_INDEX = 5

/* ── 칸 정의 ── 카드와 표가 그리는 열. 퍼널 단계(STAGES) + 파생 칸(수술대기).
 *
 * 수술대기는 **퍼널 밴드로는 그리지 않는다**. 등록의 부분집합이라 완료와 형제이고,
 * 밴드에 끼우면 735 → 156 → 579 로 줄었다 늘어 퍼널이 거짓말을 한다.
 * 대신 숫자로는 보여야 하는 값이라 카드·표에는 칸으로 넣는다.
 *
 * prev  통과율 분모가 되는 칸의 인덱스(-1 이면 비율 없음).
 *       수술완료는 대기(6)가 아니라 등록(5) 대비여야 한다 — 대기를 건너뛴다. */
interface ColDef {
  label: string
  hint: string
  color: string
  value: (r: ReservationChannelFunnelItem) => number
  total: (r: ReservationChannelFunnelItem) => number
  prev: number
  /** 퍼널 단계가 아닌 파생 칸 — 표에서 점선 테두리로 구분한다. */
  derived?: boolean
}

const stageCol = (i: number, prev: number): ColDef => {
  const s = STAGES[i]
  return {
    label: s.label,
    hint: s.hint,
    color: s.color,
    prev,
    value: (r) => r[s.personKey],
    total: (r) => r[s.totalKey],
  }
}

const COLS: ColDef[] = [
  stageCol(0, -1),
  stageCol(1, 0),
  stageCol(2, 1),
  stageCol(3, 2),
  stageCol(4, 3),
  stageCol(5, 4), // 수술등록
  stageCol(6, 5), // 수술완료 — 등록 바로 뒤. 이 표의 핵심 전환율이라 붙여 둔다
  {
    // 수술대기 — 파생. 완료의 **잔여**라 완료 뒤에 온다
    label: '수술대기',
    hint: '수술예약은 잡았지만 아직 수술일이 오지 않은 사람 = 수술등록 − 수술완료. 이탈이 아니다',
    color: '#eab308',
    prev: 5, // 비율의 분모는 앞칸(완료)이 아니라 수술등록이다
    derived: true,
    value: (r) => r.surgeryPersons - r.surgeryDonePersons,
    total: (r) => r.totalSurgeryPersons - r.totalSurgeryDonePersons,
  },
  stageCol(7, 6), // 재수술 — 대기(7)가 아니라 수술완료(6) 대비
]

/** '수술 유형별' 패널을 여는 수술완료 칸. 유형은 실제 수술한 사람에게만 있다.
 *  대기 칸이 뒤에 끼어 있어 COLS 와 STAGES 의 인덱스가 마지막 칸에서만 어긋난다. */
const TYPE_COL = 6
const TYPE_STAGE = 6
/** 통과율이 낮을 때 빨갛게 칠할 마지막 칸. 그 뒤(대기·완료·재수술)는 이탈이 아니다. */
const LAST_DROP_COL = 5

/** 수술 유형 라벨·색. 건수는 API 가 실제 수술명에서 분류해 준다(추정 아님).
 *  분류 규칙은 surgery_op_type() 함수 하나뿐이라 수술 통계와 항상 같은 기준이다. */
const TYPE_LABELS: Record<string, { name: string; color: string }> = {
  smilePro: { name: '스마일프로', color: '#F58A93' },
  smile: { name: '스마일', color: '#ED0F8C' },
  lasek: { name: '라섹', color: '#2C7BE5' },
  tIcl: { name: 'T-ICL', color: '#F5A623' },
  icl: { name: 'ICL', color: '#F26522' },
  lasik: { name: '라식', color: '#3B82F6' },
  catMulti: { name: '백내장(다초점)', color: '#F97316' },
  catEdof: { name: '백내장(연속초점)', color: '#EF4444' },
  tKpl: { name: 'T-KPL', color: '#2DD4A7' },
  kpl: { name: 'KPL', color: '#10B981' },
  catMono: { name: '백내장(단초점)', color: '#64748B' },
  presbyond: { name: '프레스비욘드', color: '#8B5CF6' },
  viva: { name: 'VIVA', color: '#6366F1' },
  other: { name: '기타', color: '#94A3B8' },
}

/* ── 기간 헬퍼 (예약자 리스트와 같은 규칙: 진행 중인 달은 오늘까지) ── */
const pad = (n: number) => String(n).padStart(2, '0')
const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const currentMonth = () => todayIso().slice(0, 7)
/** 시작월 1일 ~ 끝월 말일. 역순으로 골라도 바꿔서 계산한다 — 에러 상태를 만들지 않는다. */
const monthSpan = (a: string, b: string) => {
  const [start, end] = a <= b ? [a, b] : [b, a]
  const [y, m] = end.split('-').map(Number)
  const from = `${start}-01`
  let to = `${end}-${pad(new Date(y, m, 0).getDate())}`
  const today = todayIso()
  if (to > today) to = today
  return { from, to }
}
const monthLabel = (m: string) => `${m.replace('-', '년 ')}월`
const nf = (n: number) => n.toLocaleString('ko-KR')
/** 수술 매출 — 억 단위로 줄인다. 원 단위로 찍으면 자릿수가 길어 표가 읽히지 않는다. */
const won = (v: number) => {
  if (!v) return '—'
  if (v >= 100000000)
    return `${(v / 100000000).toFixed(2).replace(/\.?0+$/, '')}억`
  return `${Math.round(v / 10000).toLocaleString('ko-KR')}만`
}
/** 소수 1자리. 딱 떨어지면 정수로 — 숫자가 많은 화면이라 자릿수를 줄인다. */
const pct = (num: number, den: number) => {
  if (!den) return '—'
  const v = (num * 100) / den
  return `${Number.isInteger(v) ? v : v.toFixed(1)}%`
}

/* ── 퍼널 SVG 좌표계 ──
 * 밴드를 세로 중앙 정렬해 좁아지는 흐름이 바로 보이게 한다.
 * 높이는 1단계(예약) 대비 비율이라, 채널을 바꿔도 그 채널 안에서의 잔존율을 나타낸다. */
const VB_W = 1200
const VB_H = 280
const CY = VB_H / 2
const MAX_H = 232

/* ── 밴드 x 좌표 ──
 * 위 카드는 9칸(COLS), 아래 밴드는 8개(STAGES)라 그냥 8등분하면 둘이 어긋난다.
 * 그래서 밴드도 **카드 칸을 단위로** 넓이를 준다. 수술완료 밴드가 2칸을 덮는데,
 * 그 2칸이 수술완료 카드 + 수술대기 카드이기 때문이다 — 대기는 완료에서 갈라져
 * 나온 값이라 밴드로는 같은 구간이다. 이렇게 하면 모든 밴드가 제 카드 밑에 선다. */
const BAND_SPAN = [1, 1, 1, 1, 1, 1, 2, 1]
const COL_W = VB_W / BAND_SPAN.reduce((a, b) => a + b, 0)
const BAND_X = BAND_SPAN.map((_, i) =>
  BAND_SPAN.slice(0, i).reduce((a, b) => a + b, 0),
)

/** 정렬 키 — 'channel' | 단계 인덱스('0'~'4') | 'final'. 헤더를 눌러 바꾼다. */
type SortKey = string
type SortDir = 'asc' | 'desc'

/** 머리글 정렬 표시. 컴포넌트 밖에 둔다 — 렌더마다 새로 만들면 매번 다시 마운트된다. */
const SortIcon = ({ active, dir }: { active: boolean; dir: SortDir }) => {
  if (!active)
    return <ChevronsUpDown className="h-3 w-3 flex-none text-slate-300" />
  return dir === 'asc' ? (
    <ChevronUp className="h-3 w-3 flex-none text-slate-600" />
  ) : (
    <ChevronDown className="h-3 w-3 flex-none text-slate-600" />
  )
}

export function ReservationChannelPage() {
  // 시작월~끝월 범위 조회. 같은 달로 두면 기존 단일 월 조회와 동일하다.
  const [draft, setDraft] = useState({
    start: currentMonth(),
    end: currentMonth(),
  })
  const [query, setQuery] = useState({
    start: currentMonth(),
    end: currentMonth(),
  })
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: '0',
    dir: 'desc',
  })
  const [sel, setSel] = useState<string | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  // 기본 열림 — 정보를 먼저 보여주고, 필요 없으면 ✕ 로 닫게 한다.
  const [typeOpen, setTypeOpen] = useState(true)

  const { from, to } = useMemo(() => monthSpan(query.start, query.end), [query])
  const { rows, isLoading, isFetching, isError } = useReservationChannel(
    from,
    to,
  )
  const loading = isLoading || isFetching

  /** 합계는 채널 값을 더하지 않고 서버가 준 전체 기준값을 쓴다 —
   *  한 사람이 두 채널로 예약하면 채널마다 1명씩 세어져 더하면 중복된다. */
  const total = useMemo(
    () => STAGES.map((s) => rows[0]?.[s.totalKey] ?? 0),
    [rows],
  )

  const selRow = sel ? (rows.find((r) => r.channel === sel) ?? null) : null
  /** 퍼널이 그리는 값 — 채널을 고르면 그 채널, 아니면 전체 */
  const funnel = useMemo(
    () => STAGES.map((s, i) => (selRow ? selRow[s.personKey] : total[i])),
    [selRow, total],
  )

  /** 카드가 그리는 값 — 퍼널과 달리 파생 칸(수술대기)도 포함한다.
   *  채널을 고르면 그 채널, 아니면 전체 기준. */
  const cardValues = useMemo(
    () =>
      COLS.map((c) =>
        selRow ? c.value(selRow) : rows[0] ? c.total(rows[0]) : 0,
      ),
    [selRow, rows],
  )
  /** 표 합계행 — 채널을 골라도 항상 전체 기준이다(카드와 달리 선택을 따라가지 않는다). */
  const colTotals = useMemo(
    () => COLS.map((c) => (rows[0] ? c.total(rows[0]) : 0)),
    [rows],
  )

  const base = funnel[0] || 0
  const hOf = (v: number) => (base ? (v / base) * MAX_H : 0)

  /** 단계 사이 이탈. 가장 큰 이탈을 빨갛게 강조해 병목이 바로 보이게 한다. */
  const drops = useMemo(
    () => funnel.slice(0, -1).map((v, i) => v - funnel[i + 1]),
    [funnel],
  )
  /** 수술등록 − 수술완료. 이건 이탈이 아니라 아직 수술 날짜를 기다리는 사람이다. */
  const waitCount = drops[WAIT_GAP_INDEX] ?? 0
  /** 병목 강조 대상은 **진짜 이탈 구간**만이다.
   *  수술등록→수술완료는 대기이고, 수술완료→재수술은 오히려 안 갈수록 좋은 구간이라
   *  둘을 섞으면 "가장 큰 이탈"이 늘 맨 뒤를 가리켜 병목을 못 찾는다. */
  const maxDrop = Math.max(0, ...drops.slice(0, WAIT_GAP_INDEX))

  /* ── 수술 유형별 (실데이터) ──
   * 예약자 리스트의 수술명(OPERATIONDATA·Cataract_Operationdata)에서 분류한 값이라 추정이 아니다.
   * ⚠️ 수술등록이 있어도 아직 수술 전이면 유형이 없다 — 합계가 수술등록 인원보다 적은 게 정상.
   *    (2026-07: 수술등록 735건 중 수술명 574건) */
  const { rows: opTypeRows } = useReservationChannelOpTypes(from, to)
  const types = useMemo(() => {
    const scoped = opTypeRows.filter((r) =>
      sel ? r.channel === sel : r.channel == null,
    )
    const sorted = [...scoped].sort((a, b) => b.persons - a.persons)
    const top = sorted[0]?.persons ?? 1
    const sum = sorted.reduce((acc, r) => acc + r.persons, 0)
    return sorted.map((r) => ({
      key: r.opType,
      name: TYPE_LABELS[r.opType]?.name ?? r.opType,
      color: TYPE_LABELS[r.opType]?.color ?? '#94A3B8',
      w: `${(r.persons / top) * 100}%`,
      count: `${nf(r.persons)}명`,
      share: pct(r.persons, sum),
    }))
  }, [opTypeRows, sel])
  /** 유형이 확인된 인원(= 실제 수술까지 간 사람). 수술등록 인원과 다르다. */
  const typedPeople = useMemo(
    () =>
      opTypeRows
        .filter((r) => (sel ? r.channel === sel : r.channel == null))
        .reduce((a, r) => a + r.persons, 0),
    [opTypeRows, sel],
  )

  const finalRate = (r: ReservationChannelFunnelItem) =>
    r.reservedPersons ? (r.surgeryPersons * 100) / r.reservedPersons : 0
  /** 객단가 = 수술 매출 ÷ **실제 수납이 잡힌 사람**.
   *  수술등록 인원으로 나누면 아직 수술 전인 사람(0원)이 섞여 낮게 나온다
   *  (2026-07: 274만 vs 실제 353만). */
  const aov = (r: ReservationChannelFunnelItem) =>
    r.surgeryPaidPersons ? r.surgeryAmount / r.surgeryPaidPersons : 0

  const sortedRows = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      if (sort.key === 'channel')
        return a.channel.localeCompare(b.channel, 'ko') * dir
      if (sort.key === 'final') return (finalRate(a) - finalRate(b)) * dir
      if (sort.key === 'amount')
        return (a.surgeryAmount - b.surgeryAmount) * dir
      if (sort.key === 'aov') return (aov(a) - aov(b)) * dir
      const c = COLS[Number(sort.key)]
      return c ? (c.value(a) - c.value(b)) * dir : 0
    })
  }, [rows, sort])

  /** 같은 칸을 다시 누르면 방향만 뒤집는다. 다른 칸은 큰 값부터(내림차순) 시작 —
   *  인원 칸은 보통 많은 쪽을 먼저 보고 싶어서다. 채널명만 가나다순(오름차순)으로 시작한다. */
  const toggleSort = (key: SortKey) =>
    setSort((p) =>
      p.key === key
        ? { key, dir: p.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'channel' ? 'asc' : 'desc' },
    )

  const maxReserved = useMemo(
    () => Math.max(0, ...rows.map((r) => r.reservedPersons)),
    [rows],
  )

  /** 표 상태만 되돌린다. 이미 기본값이면 버튼을 눌러도 바뀔 게 없어 비활성으로 둔다. */
  const isTablePristine = sort.key === '0' && sort.dir === 'desc' && sel == null
  const handleTableReset = () => {
    setSort({ key: '0', dir: 'desc' })
    setSel(null)
  }

  const handleReset = () => {
    const cur = { start: currentMonth(), end: currentMonth() }
    setDraft(cur)
    setQuery(cur)
    setSort({ key: '0', dir: 'desc' })
    setSel(null)
    setTypeOpen(true)
  }

  // 칸 수는 COLS 길이에서 뽑는다 — 칸을 늘렸는데 여기가 고정이면 열이 통째로 어긋난다.
  const gridCols = `104px repeat(${COLS.length}, minmax(0,1fr)) 78px 82px 82px`

  return (
    <PanelShell variant="bar" isLoading={loading} isError={isError}>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        {/* ── 헤더 ── */}
        {/* '사람 수' 배지와 설명 문단은 뺐다 — 단위는 아래 표 안내에도 적혀 있어 중복이고,
            헤더가 두 줄이면 그만큼 퍼널이 밀린다. items-end → items-center 로 맞춘다. */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[22px] font-bold tracking-tight text-slate-900">
              예약 퍼널 · 채널별
            </h1>
            <span className="rounded-md bg-slate-200/70 px-2 py-[3px] text-[11px] font-semibold text-slate-600">
              {query.start === query.end
                ? monthLabel(query.start)
                : `${monthLabel(query.start)} ~ ${monthLabel(query.end)}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MonthPicker
              ariaLabel="시작 월"
              value={draft.start}
              onChange={(m) => setDraft((p) => ({ ...p, start: m }))}
              defaultValue={currentMonth()}
              className="flex h-[34px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-[13px] font-medium text-slate-900 transition-colors hover:border-blue-300"
            />
            <span className="text-[13px] font-medium text-slate-400">~</span>
            <MonthPicker
              ariaLabel="끝 월"
              value={draft.end}
              onChange={(m) => setDraft((p) => ({ ...p, end: m }))}
              defaultValue={currentMonth()}
              className="flex h-[34px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 text-[13px] font-medium text-slate-900 transition-colors hover:border-blue-300"
            />
            <Button
              className="h-[34px] gap-1.5 rounded-lg bg-slate-900 px-4 text-[13px] font-semibold hover:bg-slate-800"
              onClick={() => setQuery(draft)}
            >
              <Search className="h-3.5 w-3.5" /> 조회
            </Button>
            <Button
              variant="outline"
              className="h-[34px] gap-1.5 rounded-lg px-3.5 text-[13px]"
              onClick={handleReset}
            >
              <RotateCcw className="h-3.5 w-3.5" /> 초기화
            </Button>
          </div>
        </div>

        {/* ── 퍼널 카드 ── */}
        <div className="shrink-0 rounded-2xl border border-slate-200/80 bg-white px-7 pb-6 pt-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 flex-wrap items-baseline gap-3">
              <span className="whitespace-nowrap text-[15px] font-bold text-slate-900">
                {selRow ? `${selRow.channel} 퍼널` : '전체 퍼널'}
              </span>
              <span className="text-xs text-slate-400">
                예약 {nf(funnel[0])}명 · 최종 전환{' '}
                {pct(funnel[FINAL_INDEX], funnel[0])}
                {waitCount > 0 && ` · 수술 대기 ${nf(waitCount)}명`}
                {maxDrop > 0 &&
                  ` · 가장 큰 이탈은 ${STAGES[drops.indexOf(maxDrop)].label} → ${STAGES[drops.indexOf(maxDrop) + 1].label}`}
              </span>
            </div>
            {selRow && (
              <button
                onClick={() => setSel(null)}
                className="flex h-[30px] items-center gap-1.5 rounded-full border border-slate-300 bg-slate-50 pl-3 pr-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                {selRow.channel} 채널만 보기{' '}
                <X className="h-3 w-3 text-slate-400" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-stretch">
            {/* 카드 9칸이 한 줄로 유지되려면 여기가 넓어야 한다 — 유형 패널보다 우선 배분한다. */}
            <div
              className="flex min-w-0 flex-1 flex-col justify-center"
              style={{ flexBasis: '900px' }}
            >
              {/* 단계 카드 — 사람 수(검정) + 직전 대비 잔존율 */}
              <div className="grid grid-cols-3 sm:grid-cols-5 xl:grid-cols-9">
                {COLS.map((c, i) => {
                  const isType = i === TYPE_COL
                  return (
                    <div
                      key={c.label}
                      title={c.hint}
                      onClick={
                        isType ? () => setTypeOpen((v) => !v) : undefined
                      }
                      className={`flex min-w-0 flex-col gap-1.5 rounded-xl px-2 py-2.5 transition-colors ${isType ? 'cursor-pointer' : ''} ${c.derived ? 'border border-dashed border-amber-200 bg-amber-50/40' : ''}`}
                      style={{
                        background: isType && typeOpen ? '#fff8eb' : undefined,
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span
                          className="h-2 w-2 flex-none rounded"
                          style={{ background: c.color }}
                        />
                        <span className="truncate text-[12px] font-semibold text-slate-500">
                          {c.label}
                        </span>
                        {isType &&
                          (typeOpen ? (
                            <ChevronUp className="h-3 w-3 flex-none text-amber-500" />
                          ) : (
                            <ChevronDown className="h-3 w-3 flex-none text-amber-500" />
                          ))}
                      </div>
                      {/* 비율은 **전체 대비 하나만** 둔다 — 예약 100명 중 몇 명이 여기까지 왔나(누적 생존율).
                          직전 대비까지 같이 두니 카드마다 숫자가 셋이라 읽히지 않았다.
                          단계별 병목은 바로 아래 퍼널의 이탈 알약이 이미 보여준다.
                          한 줄로 유지해야 하므로 flex-wrap 을 쓰지 않는다 — 줄바꿈되면 카드 높이가 들쭉날쭉해진다. */}
                      <div className="flex items-baseline gap-1 whitespace-nowrap">
                        <span className="text-[19px] font-bold leading-none tracking-tight tabular-nums text-slate-900">
                          {nf(cardValues[i])}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">
                          명
                        </span>
                        <span
                          className="ml-auto text-[11px] font-bold tabular-nums"
                          style={{ color: i === 0 ? '#94a3b8' : c.color }}
                        >
                          {i === 0 ? '100%' : pct(cardValues[i], cardValues[0])}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 퍼널 밴드 */}
              <div className="relative w-full">
                <svg
                  viewBox={`0 0 ${VB_W} ${VB_H}`}
                  width="100%"
                  className="block"
                >
                  {STAGES.map((s, i) => {
                    const last = i === STAGES.length - 1
                    const vNext = last ? funnel[i] : funnel[i + 1]
                    const w = BAND_SPAN[i] * COL_W
                    const x0 = BAND_X[i] * COL_W,
                      x1 = x0 + w
                    const h0 = hOf(funnel[i]),
                      h1 = hOf(vNext)
                    const t0 = CY - h0 / 2,
                      b0 = CY + h0 / 2,
                      t1 = CY - h1 / 2,
                      b1 = CY + h1 / 2
                    const cx0 = x0 + w * 0.45,
                      cx1 = x0 + w * 0.55
                    return (
                      <g
                        key={s.label}
                        onMouseEnter={() => setHover(i)}
                        onMouseLeave={() => setHover(null)}
                        onClick={
                          i === TYPE_STAGE
                            ? () => setTypeOpen((v) => !v)
                            : undefined
                        }
                        style={{
                          cursor: i === TYPE_STAGE ? 'pointer' : 'default',
                        }}
                      >
                        <rect
                          x={x0}
                          y={0}
                          width={w}
                          height={VB_H}
                          fill="transparent"
                        />
                        <path
                          d={`M${x0} ${t0}C${cx0} ${t0},${cx1} ${t1},${x1} ${t1}L${x1} ${b1}C${cx1} ${b1},${cx0} ${b0},${x0} ${b0}Z`}
                          fill={s.color}
                          opacity={hover == null || hover === i ? 1 : 0.45}
                          className="transition-opacity"
                        />
                      </g>
                    )
                  })}
                </svg>

                {/* 구간 알약 — 세 종류다. 같은 모양으로 그리면 정반대로 읽힌다.
                      이탈   빠져나간 사람. 빨강, 가장 큰 곳을 강조
                      대기   수술등록→수술완료. 아직 수술일이 안 온 사람이라 이탈이 아니다 → 노랑
                      재수술 수술완료→재수술. '줄어든 수'가 아니라 재수술 인원 자체를 쓴다.
                             적을수록 좋은 구간이라 빨강을 쓰지 않는다 → 회색 */}
                {drops.map((d, i) => {
                  const wait = i === WAIT_GAP_INDEX
                  const reop = i === REOP_GAP_INDEX
                  const big = !wait && !reop && d === maxDrop && d > 0
                  const v = reop ? funnel[i + 1] : d
                  return (
                    <div
                      key={i}
                      className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 items-baseline gap-1.5 rounded-full border px-2.5 py-1 shadow-sm"
                      style={{
                        left: `${(((BAND_X[i] + BAND_SPAN[i]) * COL_W) / VB_W) * 100}%`,
                        top: '50%',
                        background: wait
                          ? '#fffbeb'
                          : reop
                            ? '#f8fafc'
                            : big
                              ? '#fef2f2'
                              : '#fff',
                        borderColor: wait
                          ? '#fde68a'
                          : reop
                            ? '#e2e8f0'
                            : big
                              ? '#fecaca'
                              : '#e8ecf1',
                      }}
                    >
                      <span
                        className={`whitespace-nowrap text-xs font-bold tabular-nums ${
                          wait
                            ? 'text-amber-600'
                            : reop
                              ? 'text-slate-500'
                              : 'text-red-600'
                        }`}
                      >
                        {wait
                          ? `대기 ${nf(v)}명`
                          : reop
                            ? `재수술 ${nf(v)}명`
                            : v > 0
                              ? `−${nf(v)}명`
                              : '0'}
                      </span>
                      <span className="whitespace-nowrap text-[10.5px] font-semibold tabular-nums text-slate-400">
                        {pct(v, funnel[i])}
                      </span>
                    </div>
                  )
                })}

                {/* 호버 툴팁 */}
                {hover != null && (
                  <div
                    className="pointer-events-none absolute z-10 min-w-[178px] -translate-x-1/2 -translate-y-[110%] rounded-xl bg-slate-900 px-3 py-2.5 shadow-lg"
                    style={{
                      left: `${(((BAND_X[hover] + BAND_SPAN[hover] / 2) * COL_W) / VB_W) * 100}%`,
                      top: `${((CY - hOf(funnel[hover]) / 2) / VB_H) * 100}%`,
                    }}
                  >
                    <div className="mb-1.5 flex items-center gap-1.5">
                      <span
                        className="h-[7px] w-[7px] rounded-full"
                        style={{ background: STAGES[hover].color }}
                      />
                      <span className="text-xs font-bold text-white">
                        {STAGES[hover].label}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3.5 text-[11.5px] leading-relaxed text-slate-300">
                      <span>진입</span>
                      <span className="font-semibold text-white">
                        {nf(funnel[hover])}명{' '}
                        <span className="font-normal text-slate-400">
                          (전체 {pct(funnel[hover], funnel[0])})
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between gap-3.5 text-[11.5px] leading-relaxed text-slate-300">
                      <span>
                        {hover === WAIT_GAP_INDEX
                          ? '수술 대기'
                          : hover === REOP_GAP_INDEX
                            ? '재수술'
                            : '다음 단계 이탈'}
                      </span>
                      <span
                        className={`font-semibold ${
                          hover === WAIT_GAP_INDEX
                            ? 'text-amber-300'
                            : hover === REOP_GAP_INDEX
                              ? 'text-slate-200'
                              : 'text-red-300'
                        }`}
                      >
                        {hover === STAGES.length - 1
                          ? '—'
                          : hover === REOP_GAP_INDEX
                            ? `${nf(funnel[hover + 1])}명 (${pct(funnel[hover + 1], funnel[hover])})`
                            : `${nf(drops[hover])}명 (${pct(drops[hover], funnel[hover])})`}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3.5 text-[11.5px] leading-relaxed text-slate-300">
                      <span>잔존</span>
                      <span className="font-semibold text-white">
                        {hover === STAGES.length - 1
                          ? `최종 ${pct(funnel[FINAL_INDEX], funnel[0])}`
                          : /* 재수술 구간은 위 줄이 이미 같은 값을 보여줘 잔존을 또 쓰면 중복이다 */
                            hover === REOP_GAP_INDEX
                            ? '—'
                            : `${nf(funnel[hover + 1])}명 (${pct(funnel[hover + 1], funnel[hover])})`}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── 수술 유형별 (실데이터) ──
                폭은 퍼널에 양보한다 — 유형 목록은 짧은 라벨과 숫자뿐이라 좁혀도 읽히지만,
                퍼널은 넓을수록 밴드 기울기와 카드 정렬이 살아난다. */}
            {typeOpen && (
              <div
                className="ml-4 flex min-w-[218px] flex-1 flex-col justify-center border-l border-slate-100 pl-4"
                style={{ flexBasis: '224px' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 flex-none rounded"
                        style={{ background: '#f59e0b' }}
                      />
                      <span className="text-[14.5px] font-bold text-slate-900">
                        수술 유형별
                      </span>
                    </div>
                    <span className="text-[11.5px] leading-relaxed text-slate-400">
                      {selRow ? `${selRow.channel} · ` : ''}수술완료{' '}
                      {nf(funnel[TYPE_STAGE])}명의 시술
                    </span>
                  </div>
                  <button
                    onClick={() => setTypeOpen(false)}
                    className="flex h-[24px] w-[24px] flex-none items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>

                <div className="mt-2.5 flex flex-col">
                  {types.length === 0 ? (
                    <p className="py-5 text-center text-[11px] text-slate-400">
                      수술 통계를 불러오지 못했습니다.
                    </p>
                  ) : (
                    <>
                      {/* 폭은 그대로 두고 글자만 키운다 — 고정 칸을 줄여 그만큼을 막대에서 뺀다.
                          막대는 비중을 눈으로만 훑는 용도라 좁아져도 되지만, 숫자는 읽혀야 한다. */}
                      {types.map((t) => (
                        <div
                          key={t.key}
                          className="grid h-[24px] items-center gap-1.5"
                          style={{ gridTemplateColumns: '66px 1fr 42px 36px' }}
                        >
                          <span className="truncate text-right text-[12px] font-semibold text-slate-500">
                            {t.name}
                          </span>
                          <div className="relative h-2.5 min-w-0">
                            <div
                              className="absolute left-0 top-0 h-2.5 rounded-full"
                              style={{
                                width: t.w,
                                minWidth: 3,
                                background: t.color,
                              }}
                            />
                          </div>
                          <span className="whitespace-nowrap text-right text-[12.5px] font-bold tabular-nums text-slate-900">
                            {t.count}
                          </span>
                          <span className="whitespace-nowrap text-right text-[11px] tabular-nums text-slate-400">
                            {t.share}
                          </span>
                        </div>
                      ))}
                      {/* 합계 — 유형 건수의 합이다. 좌우에 다른 시술을 받으면 두 유형에 잡히므로
                          실제 수술 인원(수술완료)보다 클 수 있다. 비교 기준인 완료 인원은
                          패널 부제에 적었다 — 폭이 좁아 이 줄에 두 숫자가 들어가지 않는다. */}
                      <div
                        className="mt-1.5 grid h-[26px] items-center gap-1.5 border-t border-slate-200 pt-1"
                        title="실제 수술명에서 분류한 값입니다(수술 통계와 같은 기준). 좌우에 다른 시술을 받으면 두 유형 모두에 잡혀 합이 수술완료 인원보다 클 수 있습니다."
                        style={{ gridTemplateColumns: '66px 1fr 42px 36px' }}
                      >
                        <span className="truncate text-right text-[12px] font-bold text-slate-700">
                          합계
                        </span>
                        <span />
                        <span className="whitespace-nowrap text-right text-[12.5px] font-bold tabular-nums text-slate-900">
                          {nf(typedPeople)}명
                        </span>
                        <span className="whitespace-nowrap text-right text-[11px] font-semibold tabular-nums text-slate-500">
                          100%
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 채널별 표 ── */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 px-6 pb-3 pt-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[15px] font-bold text-slate-900">
                채널별 단계 통과
              </span>
              <span className="text-[11.5px] text-slate-400">
                행을 클릭하면 위 퍼널이 해당 채널 기준으로 바뀝니다 · 머리글을
                클릭하면 정렬됩니다 · 모든 숫자는 사람 수(명)
              </span>
            </div>
            {/* 표 상태(정렬·채널 선택)만 되돌린다 — 조회 월은 위 헤더의 초기화가 맡는다. */}
            <button
              onClick={handleTableReset}
              disabled={isTablePristine}
              title="정렬과 채널 선택을 되돌립니다"
              className="flex h-[30px] flex-none items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-default disabled:border-slate-100 disabled:text-slate-300 disabled:hover:bg-white"
            >
              <RotateCcw className="h-3.5 w-3.5" /> 초기화
            </button>
          </div>

          <div className="min-h-0 w-full flex-1 overflow-auto">
            <div className="min-w-[1660px]">
              <div
                className="sticky top-0 z-10 grid h-[38px] items-center border-b border-slate-100 bg-slate-50 px-6"
                style={{ gridTemplateColumns: gridCols }}
              >
                <button
                  onClick={() => toggleSort('channel')}
                  className="flex items-center gap-1 text-left text-[11.5px] font-semibold text-slate-400 hover:text-slate-600"
                >
                  채널{' '}
                  <SortIcon active={sort.key === 'channel'} dir={sort.dir} />
                </button>
                {COLS.map((c, i) => (
                  <button
                    key={c.label}
                    onClick={() => toggleSort(String(i))}
                    title={c.hint}
                    className="flex min-w-0 items-center gap-1.5 pl-2.5 hover:opacity-80"
                  >
                    <span
                      className={`h-1.5 w-1.5 flex-none rounded-full ${c.derived ? 'ring-1 ring-amber-300' : ''}`}
                      style={{ background: c.color }}
                    />
                    <span
                      className={`whitespace-nowrap text-[11.5px] font-semibold ${c.derived ? 'text-amber-700' : 'text-slate-500'}`}
                    >
                      {c.label}
                    </span>
                    <SortIcon active={sort.key === String(i)} dir={sort.dir} />
                  </button>
                ))}
                <button
                  onClick={() => toggleSort('final')}
                  title="수술등록 ÷ 예약 — 재수술까지 세면 0 이라 최종 전환의 기준이 될 수 없다"
                  className="flex items-center justify-end gap-1 text-[11.5px] font-semibold text-slate-400 hover:text-slate-600"
                >
                  최종 <SortIcon active={sort.key === 'final'} dir={sort.dir} />
                </button>
                <button
                  onClick={() => toggleSort('amount')}
                  title="수술 수납액 합"
                  className="flex items-center justify-end gap-1 text-[11.5px] font-semibold text-slate-400 hover:text-slate-600"
                >
                  총매출{' '}
                  <SortIcon active={sort.key === 'amount'} dir={sort.dir} />
                </button>
                <button
                  onClick={() => toggleSort('aov')}
                  title="총매출 ÷ 실제 수납 인원 (수술 전인 사람은 제외)"
                  className="flex items-center justify-end gap-1 text-[11.5px] font-semibold text-slate-400 hover:text-slate-600"
                >
                  객단가 <SortIcon active={sort.key === 'aov'} dir={sort.dir} />
                </button>
              </div>

              {sortedRows.map((r) => {
                const final = r.reservedPersons
                  ? (r.surgeryPersons * 100) / r.reservedPersons
                  : 0
                // 이 기간에 유입이 0 인 채널 — 행은 남기되 회색으로 죽여 둔다.
                // 지우면 "채널이 없는 것"과 "이번 달 0명"이 구분되지 않고 달마다 행 수가 흔들린다.
                const empty = r.reservedPersons === 0
                return (
                  <div
                    key={r.channel}
                    onClick={
                      empty
                        ? undefined
                        : () => setSel(sel === r.channel ? null : r.channel)
                    }
                    className={`grid h-11 items-center border-b border-slate-50 px-6 transition-colors ${empty ? 'cursor-default' : 'cursor-pointer hover:bg-slate-50'}`}
                    style={{
                      gridTemplateColumns: gridCols,
                      background: sel === r.channel ? '#f1f6fd' : undefined,
                    }}
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span
                        className="h-4 w-[3px] rounded-sm"
                        style={{
                          background:
                            sel === r.channel ? '#2563eb' : 'transparent',
                        }}
                      />
                      <span
                        className={`truncate text-[13px] ${empty ? 'font-normal text-slate-300' : sel === r.channel ? 'font-bold text-slate-900' : 'font-medium text-slate-900'}`}
                      >
                        {r.channel}
                      </span>
                    </div>
                    {COLS.map((c, j) => {
                      const v = c.value(r)
                      const prevV = c.prev < 0 ? 0 : COLS[c.prev].value(r)
                      // 막대 폭은 최대 채널 인원 기준 — 채널끼리 규모가 비교돼야 한다.
                      const w = maxReserved ? (v / maxReserved) * 100 : 0
                      return (
                        <div
                          key={c.label}
                          className={`flex min-w-0 items-center gap-2 pl-2.5 pr-3.5 ${c.derived ? 'bg-amber-50/50' : ''}`}
                        >
                          <div className="relative h-[9px] min-w-[20px] flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="absolute inset-y-0 left-0 rounded-full"
                              style={{
                                width: `${Math.max(w, v > 0 ? 2 : 0)}%`,
                                background: c.color,
                                opacity:
                                  sel == null || sel === r.channel ? 1 : 0.3,
                              }}
                            />
                          </div>
                          <span
                            className={`w-10 flex-none text-right text-[13.5px] tabular-nums ${empty ? 'font-normal text-slate-300' : 'font-bold text-slate-900'}`}
                          >
                            {nf(v)}
                          </span>
                          {/* 통과율이 낮으면 빨강. 단, 수술등록 이후 칸은 제외한다 —
                              대기·완료는 아직 날짜를 기다리는 것뿐이고 재수술은 늘 0 이라
                              칠하면 매달 빨간 칸이 고정으로 남아 신호가 죽는다. */}
                          <span
                            className="w-10 flex-none text-right text-[11.5px] tabular-nums"
                            style={{
                              color:
                                j > 0 &&
                                j <= LAST_DROP_COL &&
                                prevV &&
                                v / prevV < 0.7
                                  ? '#dc2626'
                                  : '#94a3b8',
                            }}
                          >
                            {c.prev < 0 ? '' : pct(v, prevV)}
                          </span>
                        </div>
                      )
                    })}
                    <span
                      className={`text-right text-[13px] tabular-nums ${empty ? 'font-normal text-slate-300' : 'font-bold text-slate-900'}`}
                    >
                      {empty ? '—' : `${final.toFixed(1).replace(/\.0$/, '')}%`}
                    </span>
                    <span
                      className={`text-right text-[12.5px] tabular-nums ${empty ? 'font-normal text-slate-300' : 'font-semibold text-emerald-700'}`}
                    >
                      {won(r.surgeryAmount)}
                    </span>
                    <span
                      className={`text-right text-[12.5px] tabular-nums ${empty ? 'font-normal text-slate-300' : 'font-medium text-slate-600'}`}
                    >
                      {won(aov(r))}
                    </span>
                  </div>
                )
              })}

              <div
                className="grid h-12 items-center bg-slate-50/60 px-6"
                style={{ gridTemplateColumns: gridCols }}
              >
                <span className="text-[13px] font-bold text-slate-900">
                  전체
                </span>
                {COLS.map((c, i) => (
                  <div
                    key={c.label}
                    className={`flex min-w-0 items-center gap-2 pl-2.5 pr-3.5 ${c.derived ? 'bg-amber-50/50' : ''}`}
                  >
                    <div className="min-w-[20px] flex-1" />
                    <span className="w-10 flex-none text-right text-[13.5px] font-bold tabular-nums text-slate-900">
                      {nf(colTotals[i])}
                    </span>
                    <span className="w-10 flex-none text-right text-[11.5px] font-semibold tabular-nums text-slate-500">
                      {c.prev < 0 ? '' : pct(colTotals[i], colTotals[c.prev])}
                    </span>
                  </div>
                ))}
                <span className="text-right text-[13px] font-bold tabular-nums text-slate-900">
                  {pct(total[FINAL_INDEX], total[0])}
                </span>
                <span className="text-right text-[12.5px] font-bold tabular-nums text-emerald-700">
                  {won(rows[0]?.totalSurgeryAmount ?? 0)}
                </span>
                <span className="text-right text-[12.5px] font-semibold tabular-nums text-slate-600">
                  {won(
                    rows[0]?.totalSurgeryPaidPersons
                      ? (rows[0]?.totalSurgeryAmount ?? 0) /
                          rows[0].totalSurgeryPaidPersons
                      : 0,
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PanelShell>
  )
}
