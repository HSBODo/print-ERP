import { useMemo, useState } from 'react'
import {
  ChevronDown, ChevronRight, ChevronsUpDown, ChevronUp,
  Download, Info, RotateCcw, Search,
} from 'lucide-react'
import { usePagination } from '#shared/hooks/usePagination'
import { Button } from '#shared/ui/Button'
import { Card, CardContent } from '#shared/ui/Card'
import { TablePagination } from '#shared/ui/TablePagination'
import { useAccumulatedEyes } from '../../hooks/useAccumulatedEyes'
import type { AccumulatedEyeItem, AccumulatedEyesField } from '../../type/api'
import { columnsToCsv, downloadCsv } from '#shared/utils/csv'

const FIELD_OPTIONS: { value: AccumulatedEyesField; label: string; placeholder: string }[] = [
  { value: 'all',   label: '전체',   placeholder: '예: 조승우 · 2233873 · 0109669 · 627122' },
  { value: 'name',  label: '이름',   placeholder: '예: 조승우' },
  { value: 'chart', label: '차트',   placeholder: '예: 2233873' },
  { value: 'phone', label: '전화',   placeholder: '예: 01096696512' },
  { value: 'eyes',  label: '안수',   placeholder: '예: 627122' },
]

// 구분(operationCategory) 배지 색 규칙 — SmsPage 의 시술군 팔레트와 통일.
// 값은 MSSQL OPERATION_CATEGORY 원본 그대로라 신규 카테고리는 fallback(gray) 로 뜬다.
const CATEGORY_STYLE: Record<string, string> = {
  '시력교정술': 'bg-blue-50 text-blue-700 border-blue-100',
  '렌즈삽입':  'bg-amber-50 text-amber-700 border-amber-100',
  '백내장':    'bg-violet-50 text-violet-700 border-violet-100',
  '드림렌즈':  'bg-cyan-50 text-cyan-700 border-cyan-100',
  '재수술':    'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100',
  '노안':      'bg-emerald-50 text-emerald-700 border-emerald-100',
}
const CATEGORY_FALLBACK = 'bg-gray-100 text-gray-600 border-gray-200'
const categoryClass = (v: string) => CATEGORY_STYLE[v.trim()] ?? CATEGORY_FALLBACK

// ── 가중치 규칙 ─────────────────────────────────────────────
// AccumulatedEyeRulesCard 의 계산식과 1:1. 판단은 대문자 부분 문자열 매칭.
// 수술일 2024-01-01 부터 현재 규칙(최대 +3), 그 이전은 legacy(+W.V, +CONT 도 +1).
const LEGACY_CUTOFF = '2024-01-01'

type WeightRule = { label: string; style: string; title: string }

const RULE_STYLE = {
  base:   'bg-gray-100 text-gray-700 border-gray-200',
  x:      'bg-sky-50 text-sky-700 border-sky-100',
  remo:   'bg-indigo-50 text-indigo-700 border-indigo-100',
  legacy: 'bg-amber-50 text-amber-700 border-amber-100',
} as const

const computeWeightRules = (opCode: string, opDate: string): WeightRule[] => {
  const code = (opCode ?? '').toUpperCase()
  const rules: WeightRule[] = [{ label: '기본', style: RULE_STYLE.base, title: '수술 그 자체 (+1)' }]

  // +X(P) 가 있으면 그것으로, 아니면 +X. 둘 다 있어도 하나만.
  if (code.includes('+X(P)')) {
    rules.push({ label: '+X(P)', style: RULE_STYLE.x, title: '옵션 +X(P) 매칭 (+1)' })
  } else if (code.includes('+X')) {
    rules.push({ label: '+X', style: RULE_STYLE.x, title: '옵션 +X 매칭 (+1)' })
  }

  if (code.includes('REMO') && code.includes('CTR')) {
    rules.push({ label: 'REMO+CTR', style: RULE_STYLE.remo, title: 'REMO 와 CTR 동시 (+1)' })
  }

  // Legacy — 2024-01-01 이전 수술일에만 적용.
  if (opDate && opDate < LEGACY_CUTOFF) {
    if (code.includes('+W.V')) {
      rules.push({ label: '+W.V', style: RULE_STYLE.legacy, title: 'legacy: +W.V (+1) · 2024↓' })
    }
    if (code.includes('+CONT')) {
      rules.push({ label: '+CONT', style: RULE_STYLE.legacy, title: 'legacy: +CONT (+1) · 2024↓' })
    }
  }
  return rules
}

/**
 * 누적 안수 리스트 — 원천 {@code OPERATION_ACCUMULATED_EYE_COUNT} 마트 조회.
 *
 * 수술 그룹 하위 · ADMIN 전용. 눈 단위 리스트(R/L 각 1행).
 *   A) 기간 필터로 리스트
 *   B) 이름 · 차트번호 · 전화 검색 (서버 부분일치)
 *   C) 향후 통계 확장은 별도 페이지에서 (마트 재사용).
 */

const today = () => new Date().toISOString().slice(0, 10)
const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

type SortKey = keyof AccumulatedEyeItem
type SortDir = 'asc' | 'desc'

/** 가상 컬럼 키 — 실제 데이터 필드가 아니라 화면에서 파생해 만드는 컬럼(가중치 등). 정렬 불가. */
type VirtualKey = 'no' | 'weightCodes' | 'weight'

type Column = {
  key: SortKey | VirtualKey
  label: string
  align?: 'left' | 'center' | 'right'
  width?: string
  render?: (row: AccumulatedEyeItem, i: number) => React.ReactNode
  /** false 이거나 가상 컬럼(no·weight*)이면 헤더 클릭 정렬 비활성. */
  sortable?: boolean
  /** CSV 출력값. 가상 컬럼(가중치 등)은 필수 — 없으면 row[key] 원값으로 폴백. */
  csv?: (row: AccumulatedEyeItem) => string | number
}

const COLUMNS: Column[] = [
  { key: 'no', label: 'No', align: 'right', width: '3rem', render: (_r, i) => i + 1, sortable: false },
  { key: 'operationDate', label: '수술일', align: 'center', width: '6rem', sortable: true },
  { key: 'custNum', label: '차트번호', align: 'left', width: '6rem', sortable: true },
  { key: 'customName', label: '이름', align: 'left', width: '5rem', sortable: true },
  { key: 'customPhone', label: '연락처', align: 'left', width: '8rem', sortable: true },
  {
    key: 'operationCategory', label: '구분', align: 'left', width: '6rem', sortable: true,
    render: (row) => {
      const v = row.operationCategory ?? ''
      if (!v) return ''
      return (
        <span
          className={
            'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ' +
            categoryClass(v)
          }
        >
          {v}
        </span>
      )
    },
  },
  { key: 'operationCode', label: '수술 코드', align: 'left', width: '12rem', sortable: true },
  {
    key: 'weightCodes', label: '가중치 코드', align: 'left', width: '14rem', sortable: false,
    render: (row) => {
      const rules = computeWeightRules(row.operationCode, row.operationDate)
      return (
        <div className="flex flex-wrap gap-1">
          {rules.map((r) => (
            <span
              key={r.label}
              title={r.title}
              className={
                'inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ' +
                r.style
              }
            >
              {r.label}
            </span>
          ))}
        </div>
      )
    },
    csv: (row) =>
      computeWeightRules(row.operationCode, row.operationDate).map((r) => r.label).join(' | '),
  },
  {
    key: 'weight', label: '가중치', align: 'right', width: '4rem', sortable: false,
    render: (row) => {
      const n = computeWeightRules(row.operationCode, row.operationDate).length
      return <span className="font-mono font-semibold text-gray-900">+{n}</span>
    },
    csv: (row) => computeWeightRules(row.operationCode, row.operationDate).length,
  },
  { key: 'eyePosition', label: '안(R/L)', align: 'center', width: '3.5rem', sortable: true },
  { key: 'accumulatedEyeCount', label: '누적 안수', align: 'right', width: '6rem', sortable: true },
  { key: 'lastModifiedDate', label: '수정 시각', align: 'left', width: '10rem', sortable: true },
]

/** 컬럼 값 비교 — 숫자는 숫자로, 그 외는 문자열 로케일 비교. null/undefined 는 뒤로. */
const compareRows = (a: AccumulatedEyeItem, b: AccumulatedEyeItem, key: SortKey): number => {
  const va = a[key]
  const vb = b[key]
  if (va == null && vb == null) return 0
  if (va == null) return 1
  if (vb == null) return -1
  if (typeof va === 'number' && typeof vb === 'number') return va - vb
  return String(va).localeCompare(String(vb))
}

/**
 * 누적 안수 카운트 규칙 안내 — 화면 상단 접힘 카드.
 *
 * 원본 로직: 백엔드 PushSchedule.taskAccumulatedEyeCount (매일 00:30 어제 수술 배치).
 * 실사용자가 화면 값을 이해할 수 있게 정의·계산식·정렬·중복 규칙만 요약.
 */
function AccumulatedEyeRulesCard() {
  const [open, setOpen] = useState(false)
  return (
    <Card className="border-border/70 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-50"
        aria-expanded={open}
      >
        <Info className="h-4 w-4 text-blue-600" />
        <span className="font-medium text-gray-900">누적 안수 규칙 안내</span>
        <span className="text-xs text-gray-500">정의 · 계산식 · 정렬 · 중복 처리</span>
        <span className="ml-auto text-gray-400">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-5 py-4 text-sm text-gray-700">
          <div className="grid gap-4 md:grid-cols-2">
            {/* 정의 */}
            <section>
              <h4 className="mb-1.5 font-semibold text-gray-900">📌 이 숫자, 무슨 뜻인가요?</h4>
              <p className="mb-2 text-xs leading-relaxed text-gray-600">
                표의 <b>누적 안수</b> 값은{' '}
                <b>"이 수술까지 포함해 병원 전체 통틀어 몇 번째 안수(眼数)인가"</b>를 나타냅니다.
                <br />
                병원 전체가 공유하는 <b>하나의 번호표</b>라고 생각하시면 됩니다 <span className="text-gray-400">(고객별 아님)</span>.
                각 행은 그 수술 순간에 붙은 <b>번호 스티커</b>입니다.
              </p>
              <div className="rounded-md border border-blue-100 bg-blue-50/40 px-2.5 py-2 text-xs text-gray-700">
                <b>예시 —</b> 지금까지 <span className="font-mono">100</span>번째 안수까지 진행 →
                새 <code className="rounded bg-white px-1">SMILE+X</code> 수술(2 안수) 발생 →
                이 수술의 값 = <b className="font-mono text-blue-700">102</b> →
                다음 수술은 <span className="font-mono">103</span>부터.
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-gray-500">
                * <b>안수(眼数)</b> = 수술한 <b>눈의 개수</b>를 세는 단위.
                양안 수술 = 2 안수, 편안 = 1 안수. 옵션이 붙으면 그만큼 더해집니다 (↓ 계산식 참조).
              </p>
            </section>

            {/* 처리 순서 */}
            <section>
              <h4 className="mb-1.5 font-semibold text-gray-900">⏰ 처리 순서</h4>
              <ul className="list-disc pl-4 text-xs leading-relaxed text-gray-600">
                <li>매일 <b>00:30</b> 어제 수술 자동 처리 (운영 환경)</li>
                <li>정렬: <code className="rounded bg-gray-100 px-1">operationDate</code> ↑
                  → <code className="rounded bg-gray-100 px-1">operationCode</code> ↑</li>
                <li>같은 날 양안 수술은 <b>수술코드 알파벳 순</b>으로 번호 부여</li>
              </ul>
            </section>

            {/* 계산식 */}
            <section className="md:col-span-2">
              <h4 className="mb-1.5 font-semibold text-gray-900">🧮 계산식 (수술 1건당 증가값)</h4>
              <p className="mb-3 text-xs text-gray-600">
                안수 = <b>눈 개수(기본 1)</b> + <b>붙은 옵션 개수</b>. 판단은 <b>수술코드 대문자 부분 문자열 매칭</b>.
              </p>

              {/* 두 시점 병렬 카드 */}
              <div className="grid gap-3 md:grid-cols-2">
                {/* 2024 이후 — 현재 규칙 */}
                <div className="rounded-lg border-2 border-blue-200 bg-blue-50/40 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-800">2024-01-01 이후 · 현재 규칙</span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">최대 +3</span>
                  </div>
                  <ul className="space-y-1.5 text-xs">
                    <li className="flex items-center justify-between">
                      <span className="text-gray-700">● 기본 (수술 그 자체)</span>
                      <span className="font-mono font-semibold text-blue-700">+1</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-gray-700">
                        ● 코드에 <code className="rounded bg-white px-1">+X</code> 또는 <code className="rounded bg-white px-1">+X(P)</code>
                        <span className="ml-1 text-[10px] text-gray-400">둘 다 있어도 하나만</span>
                      </span>
                      <span className="font-mono font-semibold text-blue-700">+1</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-gray-700">
                        ● 코드에 <code className="rounded bg-white px-1">REMO</code> <b>와</b> <code className="rounded bg-white px-1">CTR</code> 둘 다
                      </span>
                      <span className="font-mono font-semibold text-blue-700">+1</span>
                    </li>
                  </ul>
                </div>

                {/* 2024 이전 — 레거시 */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-600">2024-01-01 이전 · 레거시</span>
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-700">최대 +5</span>
                  </div>
                  <ul className="space-y-1.5 text-xs">
                    <li className="flex items-center justify-between">
                      <span className="text-gray-600">● 기본 (수술 그 자체)</span>
                      <span className="font-mono font-semibold text-gray-700">+1</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-gray-600">● 코드에 <code className="rounded bg-white px-1">+X</code> 또는 <code className="rounded bg-white px-1">+X(P)</code></span>
                      <span className="font-mono font-semibold text-gray-700">+1</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-gray-600">● 코드에 <code className="rounded bg-white px-1">REMO</code> 와 <code className="rounded bg-white px-1">CTR</code></span>
                      <span className="font-mono font-semibold text-gray-700">+1</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-gray-600">● 코드에 <code className="rounded bg-white px-1">+W.V</code> <span className="ml-1 text-[10px] text-amber-600">(2024부터 제외)</span></span>
                      <span className="font-mono font-semibold text-amber-700">+1</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="text-gray-600">● 코드에 <code className="rounded bg-white px-1">+CONT</code> <span className="ml-1 text-[10px] text-amber-600">(2024부터 제외)</span></span>
                      <span className="font-mono font-semibold text-amber-700">+1</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* 실전 예시 */}
              <div className="mt-3 rounded-lg border border-dashed border-gray-300 bg-white p-3">
                <div className="mb-1.5 text-xs font-semibold text-gray-900">📌 실전 예시 <span className="ml-1 font-normal text-gray-500">(현재 규칙 · 2024 이후)</span></div>
                <ul className="space-y-1 font-mono text-xs text-gray-700">
                  <li>
                    <code className="rounded bg-gray-100 px-1">SMILE</code>
                    <span className="mx-1.5 text-gray-400">→</span>
                    기본 <span className="text-blue-700">1</span>
                    <span className="mx-1.5 text-gray-400">=</span>
                    <b className="text-gray-900">1 안수</b>
                  </li>
                  <li>
                    <code className="rounded bg-gray-100 px-1">SMILE+X(P)</code>
                    <span className="mx-1.5 text-gray-400">→</span>
                    기본 <span className="text-blue-700">1</span> + X(P) <span className="text-blue-700">1</span>
                    <span className="mx-1.5 text-gray-400">=</span>
                    <b className="text-gray-900">2 안수</b>
                  </li>
                  <li>
                    <code className="rounded bg-gray-100 px-1">REMO+X+CTR</code>
                    <span className="mx-1.5 text-gray-400">→</span>
                    기본 <span className="text-blue-700">1</span> + X <span className="text-blue-700">1</span> + REMO+CTR <span className="text-blue-700">1</span>
                    <span className="mx-1.5 text-gray-400">=</span>
                    <b className="text-gray-900">3 안수</b>
                  </li>
                </ul>
              </div>
            </section>

            {/* 중복 처리 */}
            <section>
              <h4 className="mb-1.5 font-semibold text-gray-900">🔁 중복 처리</h4>
              <p className="text-xs leading-relaxed text-gray-600">
                <b>(고객번호 · 수술코드 · 좌우)</b> 가 같으면 이미 등록된 안수로 간주 →
                <b> 카운트 증가 없이</b> 카테고리·최근 수술일만 갱신합니다.
                기존 <code className="rounded bg-gray-100 px-1">accumulatedEyeCount</code> 는 그대로 유지.
              </p>
            </section>

            {/* 유의사항 */}
            <section>
              <h4 className="mb-1.5 font-semibold text-gray-900">⚠️ 유의사항</h4>
              <ul className="list-disc pl-4 text-xs leading-relaxed text-gray-600">
                <li>안수 값은 <b>gap 이 생길 수 있음</b> (옵션 붙은 수술마다 번호 건너뜀)</li>
                <li>판단 기준은 <b>수술일</b>(operationDate) — 실행일 아님</li>
                <li>테스트 고객은 배치에서 제외됨</li>
              </ul>
            </section>
          </div>
        </div>
      )}
    </Card>
  )
}

export function AccumulatedEyesPage() {
  const [draftFrom, setDraftFrom] = useState(daysAgo(30))
  const [draftTo, setDraftTo] = useState(today())
  const [draftKeyword, setDraftKeyword] = useState('')
  const [draftField, setDraftField] = useState<AccumulatedEyesField>('all')
  const [queryFrom, setQueryFrom] = useState(daysAgo(30))
  const [queryTo, setQueryTo] = useState(today())
  const [queryKeyword, setQueryKeyword] = useState('')
  const [queryField, setQueryField] = useState<AccumulatedEyesField>('all')
  const [hasSearched, setHasSearched] = useState(false)
  // 정렬 상태 — 기본은 누적 안수 내림차순 (최고 누적치 위로).
  //   헤더 다시 클릭 시 토글: desc → asc → 없음(서버 기본: operation_date DESC).
  const [sortKey, setSortKey] = useState<SortKey | null>('accumulatedEyeCount')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const toggleSort = (key: SortKey) => {
    // 다른 컬럼을 처음 누르면 asc 부터 시작. 누적 안수만 첫 진입 상태가 desc 라 반대 순서.
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); return }
    if (sortDir === 'asc') { setSortDir('desc'); return }
    setSortKey(null); setSortDir('asc')
  }

  const { rows, isLoading, isFetching, isError, errorMessage } = useAccumulatedEyes(
    queryFrom, queryTo, queryKeyword, queryField, hasSearched,
  )

  const currentPlaceholder = FIELD_OPTIONS.find((o) => o.value === draftField)?.placeholder ?? ''

  const sortedRows = useMemo(() => {
    if (!sortKey) return rows
    const sorted = [...rows].sort((a, b) => compareRows(a, b, sortKey))
    return sortDir === 'desc' ? sorted.reverse() : sorted
  }, [rows, sortKey, sortDir])

  const pagination = usePagination(sortedRows)

  const runSearch = () => {
    setQueryFrom(draftFrom)
    setQueryTo(draftTo)
    setQueryKeyword(draftKeyword.trim())
    setQueryField(draftField)
    pagination.resetPage()
    setHasSearched(true)
  }
  const reset = () => {
    setDraftFrom(daysAgo(30))
    setDraftTo(today())
    setDraftKeyword('')
    setDraftField('all')
  }
  const exportCsv = () => {
    if (!sortedRows.length) return
    const csv = columnsToCsv(
      // 가상 컬럼(가중치 등)은 csv() 로 파생값을 내보내고, 나머지는 row[key] 원값.
      COLUMNS.filter((c) => c.key !== 'no').map((c) => ({
        key: c.key,
        label: c.label,
        csv: c.csv,
      })),
      // 화면과 동일한 정렬 순서로 내보낸다.
      sortedRows,
    )
    downloadCsv(`누적안수_${queryFrom}_${queryTo}.csv`, csv)
  }

  return (
    <div className="space-y-4">
      <AccumulatedEyeRulesCard />
      <Card className="border-border/70 shadow-sm">
        <CardContent className="flex flex-wrap items-end gap-3 py-4">
          <div className="flex flex-col text-sm">
            <label className="mb-1 text-xs text-gray-500">기간(수술일)</label>
            <div className="flex items-center gap-2">
              <input
                type="date" value={draftFrom} onChange={(e) => setDraftFrom(e.target.value)}
                className="rounded-md border border-gray-200 px-2 py-1"
              />
              <span className="text-gray-400">~</span>
              <input
                type="date" value={draftTo} onChange={(e) => setDraftTo(e.target.value)}
                className="rounded-md border border-gray-200 px-2 py-1"
              />
            </div>
          </div>

          <div className="flex flex-col text-sm">
            <label className="mb-1 text-xs text-gray-500">검색</label>
            <div className="flex items-center gap-1.5">
              <select
                value={draftField}
                onChange={(e) => setDraftField(e.target.value as AccumulatedEyesField)}
                className="rounded-md border border-gray-200 bg-white px-2 py-1 text-sm"
              >
                {FIELD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <div className="flex items-center gap-1.5 rounded-md border border-gray-200 px-2 py-1">
                <Search className="h-3.5 w-3.5 text-gray-400" />
                <input
                  value={draftKeyword}
                  onChange={(e) => setDraftKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                  placeholder={currentPlaceholder}
                  className="w-56 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw className="mr-1 h-3.5 w-3.5" />초기화
            </Button>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={runSearch}>
              <Search className="mr-1 h-3.5 w-3.5" />조회
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
              <Download className="mr-1 h-3.5 w-3.5" />CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-0">
          <div className="px-4 py-2 text-xs text-gray-500">
            {hasSearched
              ? isLoading
                ? '불러오는 중…'
                : isError
                  ? <span className="text-red-600">{errorMessage ?? '데이터를 불러오지 못했습니다.'}</span>
                  : <>총 <b className="text-gray-900">{rows.length}</b>행 · {isFetching && <span className="ml-1 text-blue-600">갱신 중</span>}</>
              : '기간을 선택한 뒤 조회 버튼을 눌러주세요.'}
          </div>

          <div className="overflow-auto">
            <table className="min-w-full border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-gray-50 text-gray-500">
                <tr className="border-b">
                  {COLUMNS.map((c) => {
                    const canSort = c.sortable && c.key !== 'no'
                    const active = canSort && sortKey === c.key
                    const align = c.align ?? 'left'
                    return (
                      <th
                        key={String(c.key)}
                        style={{ width: c.width, textAlign: align }}
                        className={
                          'px-2 py-2 font-medium select-none ' +
                          (canSort ? 'cursor-pointer hover:text-gray-900' : '')
                        }
                        onClick={canSort ? () => toggleSort(c.key as SortKey) : undefined}
                        aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      >
                        <span
                          className={
                            'inline-flex items-center gap-1 ' +
                            (align === 'right' ? 'justify-end w-full' : align === 'center' ? 'justify-center w-full' : '')
                          }
                        >
                          {c.label}
                          {canSort && (
                            active
                              ? (sortDir === 'asc'
                                  ? <ChevronUp className="h-3 w-3" />
                                  : <ChevronDown className="h-3 w-3" />)
                              : <ChevronsUpDown className="h-3 w-3 opacity-40" />
                          )}
                        </span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {pagination.pageRows.map((row, i) => {
                  const idx = pagination.rangeStart - 1 + i
                  return (
                    <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                      {COLUMNS.map((c) => (
                        <td
                          key={String(c.key)}
                          style={{ textAlign: c.align ?? 'left' }}
                          className="px-2 py-1.5"
                        >
                          {c.render
                            ? c.render(row, idx)
                            : c.key === 'accumulatedEyeCount'
                              ? row.accumulatedEyeCount.toLocaleString()
                              : String(row[c.key as keyof AccumulatedEyeItem] ?? '')}
                        </td>
                      ))}
                    </tr>
                  )
                })}
                {hasSearched && !isLoading && !isError && rows.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length} className="px-4 py-16 text-center text-sm text-gray-500">
                      조건에 맞는 누적 안수 이력이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <TablePagination pagination={pagination} className="border-t border-gray-100" />
        </CardContent>
      </Card>
    </div>
  )
}
