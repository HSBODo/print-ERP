import type { ReservationChangeItem } from '../../../type/api'
import { addDays, isoWeek, toIsoDate } from '#shared/utils/isoWeek'

/**
 * 예약 변경이력 화면 모델 — 체인 문자열 해석 · 기준일(시점) 조회 · 필터/정렬 · 표기 규칙.
 * 규칙은 디렉팅/예약변경이력 README·기획서 §4·§5·§7 을 그대로 옮겼다.
 */

export const BRANCH_LABEL: Record<string, string> = { M: '시력교정', D: '드림렌즈', H: '백내장' }
export const STATE_LABEL: Record<string, string> = { Y: '예약', I: '내원', H: '퇴원', C: '취소' }
export const SOURCE_LABEL: Record<string, string> = {
  H: '변경이력 첫 저장',
  I: '등록시각 기록',
  N: '예약번호 채번일 (날짜만)',
}

/** 체인 1스텝 — 그 시각에 저장된 예약일. changedAt 은 'YYYY-MM-DD HH:MM' 또는 ''(시각 미상). */
export interface ChangeStep {
  changedAt: string
  date: string
}

export function parseChain(chain: string): ChangeStep[] {
  return chain
    .split('|')
    .filter(Boolean)
    .map((s) => {
      const i = s.indexOf('@')
      return i < 0 ? { changedAt: '', date: s } : { changedAt: s.slice(0, i), date: s.slice(i + 1) }
    })
}

export const stepDay = (step: ChangeStep) => step.changedAt.slice(0, 10)

/** 기준일까지 일어난 스텝만. 시각을 모르는 스텝은 기준일 판정을 할 수 없어 뺀다. */
export function stepsAsOf(steps: ChangeStep[], asOf: string): ChangeStep[] {
  if (!asOf) return steps
  return steps.filter((s) => s.changedAt && stepDay(s) <= asOf)
}

export const fullPath = (steps: ChangeStep[]) =>
  steps.map((s) => `${s.date}(${s.changedAt || '시각 미상'} 변경)`).join(' → ')

/* ── ISO 주차 태그: W33 · 연말연초는 W52(21) 처럼 ISO 연도를 붙인다 ── */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function weekTag(date: string): string {
  if (!DATE_RE.test(date)) return ''
  const [y, m, d] = date.split('-').map(Number)
  const { year, week } = isoWeek(new Date(y, m - 1, d))
  return `W${week}${year !== y ? `(${String(year).slice(2)})` : ''}`
}

/* ── 명절: 신정·구정·추석 당일 ±5일 (추이 그래프 명절 뷰와 같은 창) ── */
export const HOLIDAY_WINDOW_DAYS = 5
const HOLIDAYS: Record<string, string[]> = {
  '명절(구정)': ['2022-02-01', '2023-01-22', '2024-02-10', '2025-01-29', '2026-02-17', '2027-02-07'],
  '명절(추석)': ['2022-09-10', '2023-09-29', '2024-09-17', '2025-10-06', '2026-09-25', '2027-09-15'],
  신정: ['2022-01-01', '2023-01-01', '2024-01-01', '2025-01-01', '2026-01-01', '2027-01-01'],
}
const holidayMap = new Map<string, string>()
for (const [label, days] of Object.entries(HOLIDAYS)) {
  for (const day of days) {
    const [y, m, d] = day.split('-').map(Number)
    for (let offset = -HOLIDAY_WINDOW_DAYS; offset <= HOLIDAY_WINDOW_DAYS; offset++) {
      holidayMap.set(toIsoDate(addDays(new Date(y, m - 1, d), offset)), label)
    }
  }
}
export const holidayLabel = (date: string) => holidayMap.get(date) ?? ''

const holidayDays = new Map<string, string>()
for (const [label, days] of Object.entries(HOLIDAYS)) {
  for (const day of days) holidayDays.set(day, label)
}
/** 명절 당일이면 라벨(구정·추석은 당일 하루, 신정은 1/1). 창(±5일)은 holidayLabel 이 담당. */
export const holidayDayLabel = (date: string) => holidayDays.get(date) ?? ''

/* ── 필터 · 정렬 ── */
export type ChangeSort = 'date' | 'asof' | 'chg'
export interface ChangeFilters {
  /** 등록 월 '01'~'12' · '' = 월 전체 (연도는 조회 범위가 정한다) */
  month: string
  /** 기준일 'YYYY-MM-DD' · '' = 미사용 */
  asOf: string
  branch: string
  state: string
  /** 변경 N회 이상. 0 = 기준일 시점에 아직 미변경이던 건 포함 */
  minChanges: number
  sort: ChangeSort
  keyword: string
}

export interface ChangeView {
  row: ReservationChangeItem
  /** 기준일까지의 스텝(기준일 없으면 전체) */
  steps: ChangeStep[]
  full: ChangeStep[]
  /** 기준일 시점 예약일 = 기준일까지 마지막 스텝의 예약일 */
  asOfDate: string
  changes: number
  totalChanges: number
}

const registeredKey = (r: ReservationChangeItem) => `${r.registeredAt} ${r.registeredTime}`
const byRegistered = (a: ChangeView, b: ChangeView) => registeredKey(a.row).localeCompare(registeredKey(b.row))

export function buildViews(rows: ReservationChangeItem[], f: ChangeFilters): ChangeView[] {
  const q = f.keyword.trim().toLowerCase()
  const views: ChangeView[] = []
  for (const row of rows) {
    if (f.branch && row.branch !== f.branch) continue
    if (f.month && row.registeredAt.slice(5, 7) !== f.month) continue
    if (f.state && row.reserveState !== f.state) continue
    if (q && !(row.name.toLowerCase().includes(q) || row.chartNo.includes(q))) continue
    const full = parseChain(row.changeChain)
    const steps = stepsAsOf(full, f.asOf)
    if (f.asOf) {
      if (!steps.length) continue // 기준일에 아직 등록 전
      if (steps[steps.length - 1].date < f.asOf) continue // 기준일 시점 예약일이 이미 지난 건 제외
    }
    const changes = Math.max(0, steps.length - 1)
    if (changes < f.minChanges) continue
    views.push({
      row,
      steps,
      full,
      asOfDate: steps.length ? steps[steps.length - 1].date : '',
      changes,
      totalChanges: Math.max(0, full.length - 1),
    })
  }
  if (f.sort === 'chg') views.sort((a, b) => b.changes - a.changes || byRegistered(a, b))
  else if (f.sort === 'asof') views.sort((a, b) => a.asOfDate.localeCompare(b.asOfDate) || byRegistered(a, b))
  else views.sort(byRegistered)
  return views
}

/** 변경 칸 수 — 페이지가 아니라 조회 결과 전체 기준(최대 6). 페이지 이동 시 헤더가 흔들리지 않게. */
export const MAX_CHANGE_COLUMNS = 6
export const changeColumnCount = (views: ChangeView[]) =>
  Math.min(MAX_CHANGE_COLUMNS, views.reduce((m, v) => Math.max(m, v.changes), 1))
