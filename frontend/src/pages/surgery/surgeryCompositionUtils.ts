import { addDays, isoWeekMonday, isoWeeksInYear, isoYearRange, toIsoDate } from '@/utils/isoWeek'
import { formatAxisNumber } from '@/utils/stats'

/**
 * 수술별 비중 — 순수 집계/표시 로직 (JSX 없음).
 * 예약통계_백내장과 동일하게 한 달(period)을 전체/월별/주별/일별 단위로 분해한다.
 * 일별 원시 데이터(SurgeryDailyData)를 주/월로 합산하며, 비중(%)은 합산 후 재계산한다.
 *
 * 예외적으로 '주차'(yearWeek)만 조회 범위가 한 해 전체 — 예약통계시스템과 같은 ISO 8601 연간 주차다.
 */

export type Granularity = 'month' | 'yearWeek' | 'week' | 'day' | 'all'

// 주별 = 그 달의 주(1~5주) / 주차 = ISO 8601 연간 주차(01~52·53주차, 한 해 전체). 버킷 규칙이 달라 라벨·범위가 다르다.
export const GRANULARITIES: { key: Granularity; label: string }[] = [
  { key: 'month', label: '월별' },
  { key: 'yearWeek', label: '주차' },
  { key: 'week', label: '주별' },
  { key: 'day', label: '일별' },
  { key: 'all', label: '전체' },
]

/** 행 계층 — 색상 구분용. */
export type RowTier = 'month' | 'week' | 'day'

export interface Cell {
  lasek: number; lasik: number; smile: number; smilePro: number
  icl: number; tIcl: number; kpl: number; tKpl: number; viva: number
  /** 노안 레이저(PRESBYOND) — PIOL 그룹 밖의 독립 항목 */
  presbyond: number
  /**
   * PIOL DISTINCT 환자 수. icl+tIcl+kpl+tKpl+viva 를 더하면 안 된다 —
   * 양안에 다른 렌즈를 넣은 환자가 유형별로 각각 잡혀 이중 계상된다
   * (2026-07: 합산 168 vs 실인원 148).
   */
  piolPatients: number
  catMulti: number; catMono: number; catEdof: number
  xtra: number; waveVision: number; monoVision: number; contra: number; personal: number
  lasekEx: number; lasekRed: number
  reoperation: number; reopLaser: number; reopLens: number
  visionPatients: number; cataractPatients: number; total: number
}

export const EMPTY: Cell = {
  lasek: 0, lasik: 0, smile: 0, smilePro: 0, icl: 0, tIcl: 0, kpl: 0, tKpl: 0, viva: 0,
  presbyond: 0, piolPatients: 0,
  catMulti: 0, catMono: 0, catEdof: 0,
  xtra: 0, waveVision: 0, monoVision: 0, contra: 0, personal: 0,
  lasekEx: 0, lasekRed: 0,
  reoperation: 0, reopLaser: 0, reopLens: 0,
  visionPatients: 0, cataractPatients: 0, total: 0,
}

const CELL_KEYS = Object.keys(EMPTY) as (keyof Cell)[]

/** 여러 Cell 합산 */
export const sumCells = (cells: Cell[]): Cell => {
  const t = { ...EMPTY }
  for (const c of cells) for (const k of CELL_KEYS) t[k] += c[k]
  return t
}

/** 모든 지표가 0인 빈 셀(데이터 없는 날) */
export const isEmptyCell = (c: Cell): boolean => CELL_KEYS.every((k) => c[k] === 0)

const pad2 = (n: number) => String(n).padStart(2, '0')

/** 'YYYY-MM' → 현재 연/월 문자열(기본 조회월) */
export function currentMonthValue(): string {
  const now = new Date()
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`
}

/** 'YYYY-MM' → { from, to } 해당 월의 1일~말일 */
export function monthRange(ym: string): { from: string; to: string; lastDay: number } {
  const [y, m] = ym.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  return { from: `${ym}-01`, to: `${ym}-${pad2(lastDay)}`, lastDay }
}

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토']
export const weekdayKo = (idx: number): string => WEEKDAY_KO[idx] ?? ''
/** 월 내 0-based 캘린더 주차 */
export const weekOf = (day: number, firstWeekday: number): number => Math.floor((day - 1 + firstWeekday) / 7)

export interface SurgeryRow {
  label: string
  tier: RowTier
  weekday?: string
  /** 주차 행의 실제 기간 표기 — 예 '12/29~1/4'. */
  range?: string
  muted?: boolean
  weekStart?: boolean
  d: Cell
}

/** 'YYYY-MM' → 연도. 주차(yearWeek) 뷰는 이 연도 전체를 조회한다. */
export const yearOf = (ym: string): number => Number(ym.slice(0, 4))

/** 조회 범위 — 주차는 그 해 1주차 월요일~마지막 주차 일요일, 나머지는 선택한 달의 1일~말일. */
export function queryRange(granularity: Granularity, ym: string): { from: string; to: string } {
  if (granularity === 'yearWeek') {
    const { from, to } = isoYearRange(yearOf(ym))
    return { from, to }
  }
  const { from, to } = monthRange(ym)
  return { from, to }
}

const shortMd = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`

/**
 * ISO 8601 연간 주차 행 — 01주차부터 그 해 마지막 주차(52 또는 53)까지 항상 전부 노출한다.
 * 데이터가 없는 주(미래·휴진)는 muted 로 비워 두어 주차 번호가 끊기지 않게 한다.
 * 1주차는 전년 12월을, 마지막 주차는 다음 해 1월을 물 수 있다(ISO 규칙).
 */
export function buildYearWeekRows(dataMap: Record<string, Cell>, year: number): SurgeryRow[] {
  const weeks = isoWeeksInYear(year)
  const weekRows: SurgeryRow[] = []
  const allCells: Cell[] = []

  for (let week = 1; week <= weeks; week++) {
    const monday = isoWeekMonday(year, week)
    const days = Array.from({ length: 7 }, (_, i) => dataMap[toIsoDate(addDays(monday, i))] ?? EMPTY)
    const d = sumCells(days)
    allCells.push(d)
    weekRows.push({
      label: `${pad2(week)}주차`,
      tier: 'week',
      range: `${shortMd(monday)}~${shortMd(addDays(monday, 6))}`,
      muted: isEmptyCell(d),
      d,
    })
  }

  return [{ label: `${year}년`, tier: 'month', d: sumCells(allCells) }, ...weekRows]
}

/**
 * 일자별 데이터 → 조회 단위별 표시 행. (예약통계 buildDisplayRowsFromCounts와 동일 버킷팅)
 *   month:    [월합계]
 *   yearWeek: [연합계, 01주차, 02주차, …] — period 의 연도 전체(dataMap 도 1년치여야 한다)
 *   week:     [월합계, 1주, 2주, …]
 *   day:      [월합계, 1일, 2일, …]
 *   all:      [월합계, 주…, 일…]
 */
export function buildSurgeryRows(
  granularity: Granularity,
  dataMap: Record<string, Cell>,
  period: string,
  lastDay: number,
): SurgeryRow[] {
  if (granularity === 'yearWeek') return buildYearWeekRows(dataMap, yearOf(period))

  const [year, month] = period.split('-').map(Number)
  const firstWeekday = new Date(year, month - 1, 1).getDay()

  const dayRows: SurgeryRow[] = []
  const weekBuckets = new Map<number, Cell[]>()
  const allCells: Cell[] = []

  for (let day = 1; day <= lastDay; day++) {
    const dateStr = `${period}-${pad2(day)}`
    const d = dataMap[dateStr] ?? EMPTY
    const weekdayIdx = new Date(year, month - 1, day).getDay()
    allCells.push(d)

    const week = weekOf(day, firstWeekday)
    weekBuckets.set(week, [...(weekBuckets.get(week) ?? []), d])
    dayRows.push({
      label: `${day}일`,
      tier: 'day',
      weekday: weekdayKo(weekdayIdx),
      muted: isEmptyCell(d),
      weekStart: day === 1 || weekdayIdx === 0,
      d,
    })
  }

  const totalRow: SurgeryRow = {
    label: granularity === 'month' ? `${month}월` : 'TOTAL',
    tier: 'month',
    d: sumCells(allCells),
  }
  if (granularity === 'month') return [totalRow]

  const weekRows: SurgeryRow[] = [...weekBuckets.keys()]
    .sort((a, b) => a - b)
    .map((week) => ({ label: `${week + 1}주`, tier: 'week', d: sumCells(weekBuckets.get(week) ?? []) }))

  if (granularity === 'week') return [totalRow, ...weekRows]
  if (granularity === 'all') return [totalRow, ...weekRows, ...dayRows]
  return [totalRow, ...dayRows]
}

/* ── 셀 표시 헬퍼 ── */
const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0)
/** 값(비중%) — 그룹 합계 대비 */
const vp = (v: number, base: number) => (v > 0 ? `${formatAxisNumber(v)} (${pct(v, base)}%)` : '-')
const vc = (v: number) => (v > 0 ? formatAxisNumber(v) : '-')

export type Tone = 'blue' | 'violet' | undefined
export interface ColDef {
  render: (d: Cell) => string
  border?: boolean
  strong?: boolean
  muted?: boolean
  tone?: Tone
  /** 본문 셀 배경(앵커 컬럼 강조) */
  bg?: string
}

// 본문 27개 컬럼(구분 컬럼 제외) — 헤더 leaf 순서와 1:1 대응.
export const COLS: ColDef[] = [
  { render: (d) => vc(d.total), border: true, strong: true, bg: 'bg-slate-50' },                 // 합계
  { render: (d) => vc(d.visionPatients), border: true, strong: true, tone: 'blue', bg: 'bg-blue-50' }, // 시력교정
  { render: (d) => vp(d.smile, d.visionPatients) },                                              // 스마일
  { render: (d) => vp(d.smilePro, d.visionPatients) },                                           // 스마일프로
  // PIOL 합계는 유형별 합산이 아니라 원천이 세어 준 DISTINCT 환자 수(piolPatients)다.
  // 양안에 다른 렌즈를 넣은 환자가 이중 계상되므로 icl+tIcl+… 로 더하면 안 된다.
  { render: (d) => vp(d.piolPatients, d.visionPatients), border: true, strong: true },           // PIOL 합계
  { render: (d) => vc(d.icl), muted: true },                                                     // ICL
  { render: (d) => vc(d.tIcl), muted: true },                                                    // T-ICL
  { render: (d) => vc(d.kpl), muted: true },                                                     // KPL
  { render: (d) => vc(d.tKpl), muted: true },                                                    // T-KPL
  { render: (d) => vc(d.viva), muted: true },                                                    // VIVA
  { render: (d) => vp(d.presbyond, d.visionPatients), border: true, bg: 'bg-yellow-50' },        // 프레스비욘드
  { render: (d) => vp(d.lasik, d.visionPatients), border: true },                                // 라식계
  { render: (d) => vp(d.lasekEx + d.lasekRed, d.visionPatients), border: true, strong: true },   // 라섹계 합계
  { render: (d) => vp(d.lasekEx, d.lasekEx + d.lasekRed) },                                       // 라섹계 EX
  { render: (d) => vp(d.lasekRed, d.lasekEx + d.lasekRed) },                                      // 라섹계 Red
  { render: (d) => vc(d.reoperation), border: true, strong: true },                              // 재수술 합계
  { render: (d) => vp(d.reopLaser, d.reoperation) },                                             // 재수술 레이저
  { render: (d) => vp(d.reopLens, d.reoperation) },                                              // 재수술 렌즈
  { render: (d) => vc(d.xtra), border: true },                                                   // 엑스트라
  { render: (d) => vc(d.personal) },                                                             // 퍼스널
  { render: (d) => vc(d.contra) },                                                               // 콘트라
  { render: (d) => vc(d.waveVision) },                                                           // 웨이브비전
  { render: (d) => vc(d.monoVision) },                                                           // 모노비전
  { render: (d) => vc(d.cataractPatients), border: true, strong: true, tone: 'violet', bg: 'bg-violet-50' }, // 백내장 수술수
  { render: (d) => vp(d.catMulti, d.cataractPatients) },                                         // 다초점
  { render: (d) => vp(d.catEdof, d.cataractPatients) },                                          // 프리미엄
  { render: (d) => vp(d.catMono, d.cataractPatients) },                                          // 단초점
]

export const toneClass = (t: Tone) => (t === 'blue' ? 'text-blue-700' : t === 'violet' ? 'text-violet-700' : '')
