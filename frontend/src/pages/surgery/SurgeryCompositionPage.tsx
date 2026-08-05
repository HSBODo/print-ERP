import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSurgeryDaily } from '@/hooks/surgery/useSurgeryDaily'
import {
  COLS,
  GRANULARITIES,
  buildSurgeryRows,
  currentMonthValue,
  monthRange,
  queryRange,
  toneClass,
  yearOf,
  type Granularity,
  type SurgeryRow,
} from './surgeryCompositionUtils'

/* ── 헤더 스타일 ── */
const TH = 'px-1.5 py-1 font-semibold'
const THL = `${TH} border-l border-border`
const TH_B = `${TH} bg-blue-50/70`
const THL_B = `${THL} bg-blue-50/70`
const TH_V = `${TH} bg-violet-50/70`
// 프레스비욘드(노안 레이저) — PIOL 그룹 밖의 독립 항목이라 노란색으로 구분한다.
// 한글 6자('프레스비욘드')는 칼럼 폭을 과하게 벌려서 영문 표기 + 좁은 여백·자간으로 붙인다.
// TH 를 확장하지 않고 새로 쓰는 이유: px-1.5 와 px-0.5 를 같이 넣으면 어느 쪽이 이길지 불확실하다.
const THL_Y =
  'px-0.5 py-1 font-semibold border-l border-border bg-yellow-100 text-yellow-800 text-[9px] tracking-tighter'

/** 공통 3단 헤더 — 시력교정(파랑)/백내장(보라) 그룹 밴드 색상. */
function CompositionHead() {
  return (
    <thead>
      <tr className="border-y border-border">
        <th rowSpan={3} className={`${TH} bg-muted/40`}>구분</th>
        <th rowSpan={3} className={`${THL} bg-slate-100`}>합계</th>
        <th colSpan={22} className={`${THL} border-b bg-blue-100 text-blue-800`}>시력교정수술</th>
        <th colSpan={4} className={`${THL} border-b bg-violet-100 text-violet-800`}>백내장</th>
      </tr>
      <tr className="border-b border-border">
        <th rowSpan={2} className={`${THL_B} text-blue-800`}>시력교정</th>
        <th rowSpan={2} className={TH_B}>스마일</th>
        <th rowSpan={2} className={TH_B}>스마일프로</th>
        <th colSpan={6} className={`${THL_B} border-b`}>PIOL</th>
        <th rowSpan={2} className={THL_Y} title="프레스비욘드 (노안 레이저)">PRESBYOND</th>
        <th rowSpan={2} className={THL_B}>라식계</th>
        <th colSpan={3} className={`${THL_B} border-b`}>라섹계</th>
        <th colSpan={3} className={`${THL_B} border-b`}>재수술</th>
        <th rowSpan={2} className={THL_B}>엑스트라</th>
        <th rowSpan={2} className={TH_B}>퍼스널</th>
        <th rowSpan={2} className={TH_B}>콘트라</th>
        <th rowSpan={2} className={TH_B}>웨이브비전</th>
        <th rowSpan={2} className={TH_B}>모노비전</th>
        <th rowSpan={2} className={`${THL} bg-violet-100 text-violet-800`}>수술수</th>
        <th rowSpan={2} className={TH_V}>다초점</th>
        <th rowSpan={2} className={TH_V}>프리미엄</th>
        <th rowSpan={2} className={TH_V}>단초점</th>
      </tr>
      <tr className="border-b border-border text-muted-foreground">
        {/* 유형별이 환자당 대표유형 1건만 세므로 이 합계는 유형별 값의 합과 일치한다. */}
        <th
          className={THL_B}
          title="PIOL 수술 환자 수. 유형별은 환자당 대표유형(우안 우선) 한 곳에만 집계되므로 오른쪽 값들의 합과 같습니다."
        >
          합계
        </th>
        <th className={TH_B}>ICL</th>
        <th className={TH_B}>T-ICL</th>
        <th className={TH_B}>KPL</th>
        <th className={TH_B}>T-KPL</th>
        <th className={TH_B}>VIVA</th>
        <th className={THL_B}>합계</th>
        <th className={TH_B}>EX</th>
        <th className={TH_B}>Red</th>
        <th className={THL_B}>합계</th>
        <th className={TH_B}>레이저</th>
        <th className={TH_B}>렌즈</th>
      </tr>
    </thead>
  )
}

const ROW_BG: Record<SurgeryRow['tier'], string> = {
  month: 'bg-blue-50 font-semibold',
  week: 'bg-amber-100/60 font-medium',
  day: 'bg-white hover:bg-blue-50/50',
}

/** 좌측 구분 라벨 셀 배경 — 계층/요일별. */
function leftCellClass(row: SurgeryRow): string {
  if (row.tier === 'month') return 'bg-blue-100 text-blue-800'
  if (row.tier === 'week') return 'bg-amber-100 text-amber-800'
  if (row.weekday === '일') return 'bg-rose-50 text-rose-600'
  if (row.weekday === '토') return 'bg-sky-50 text-sky-600'
  return 'bg-amber-50/50 text-slate-700'
}

function DataRow({ row }: { row: SurgeryRow }) {
  const muted = Boolean(row.muted)
  const rowBg = muted ? 'bg-slate-50 text-slate-400' : ROW_BG[row.tier]
  const topBorder = row.tier === 'day' && row.weekStart ? 'border-t-2 border-t-slate-300' : ''

  return (
    <tr className={`${rowBg} ${topBorder} border-b border-border transition-colors`}>
      <td className={`px-1.5 py-1.5 font-semibold whitespace-nowrap ${leftCellClass(row)}`}>
        {row.label}{row.weekday ? ` (${row.weekday})` : ''}
        {row.range ? <span className="ml-1 text-[9px] font-normal opacity-70">{row.range}</span> : null}
      </td>
      {COLS.map((c, i) => (
        <td
          key={i}
          className={`${c.tight ? 'px-0.5' : 'px-1.5'} py-1.5 tabular-nums whitespace-nowrap ${c.border ? 'border-l border-border' : ''} ${c.strong ? 'font-semibold' : ''} ${c.muted ? 'text-muted-foreground' : ''} ${muted ? '' : `${toneClass(c.tone)} ${c.bg ?? ''}`}`}
        >
          {c.render(row.d)}
        </td>
      ))}
    </tr>
  )
}

/** 연도 선택 목록 — 올해부터 4년 전까지. */
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => yearOf(currentMonthValue()) - i)

export function SurgeryCompositionPage() {
  const [month, setMonth] = useState<string>(currentMonthValue)
  const [granularity, setGranularity] = useState<Granularity>('day')

  // 주차(yearWeek)만 그 해 전체(1주차 월요일~마지막 주차 일요일)를 조회한다.
  const isYearWeek = granularity === 'yearWeek'
  const year = yearOf(month)
  const { from, to } = useMemo(() => queryRange(granularity, month), [granularity, month])
  const { lastDay } = useMemo(() => monthRange(month), [month])
  const { dataMap, meta, latestDate, isLoading, isError } = useSurgeryDaily(from, to, true)

  const rows = useMemo(
    () => buildSurgeryRows(granularity, dataMap, month, lastDay),
    [granularity, dataMap, month, lastDay],
  )

  const granularityLabel = GRANULARITIES.find((g) => g.key === granularity)?.label ?? ''
  const periodLabel = isYearWeek ? `${year}년` : month

  return (
    <div className="space-y-4">
      {/* 조회 영역 — 조회 월(주차는 연도) + 조회 단위(월별/주차/주별/일별/전체) */}
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border/70 bg-white px-3 py-2 shadow-sm">
        <span className="text-sm font-semibold text-foreground">{isYearWeek ? '조회 연도' : '조회 월'}</span>
        {isYearWeek ? (
          <select
            aria-label="조회 연도"
            value={year}
            onChange={(e) => setMonth(`${e.target.value}-${month.slice(5, 7)}`)}
            className="h-9 w-[9rem] rounded-md border border-border/80 bg-white px-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
        ) : (
          <input
            aria-label="조회 월"
            type="month"
            value={month}
            onChange={(e) => { if (e.target.value) setMonth(e.target.value) }}
            className="h-9 w-[9rem] rounded-md border border-border/80 bg-white px-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        )}

        <div className="h-6 w-px bg-border" />

        <span className="text-sm font-semibold text-foreground">조회 단위</span>
        <div className="flex h-9 gap-1 rounded-md bg-gray-100 p-1">
          {GRANULARITIES.map((g) => (
            <button
              key={g.key}
              type="button"
              aria-pressed={granularity === g.key}
              onClick={() => setGranularity(g.key)}
              className={`rounded px-3 text-sm font-medium transition-colors ${
                granularity === g.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {isYearWeek ? (
          <span
            className="rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600"
            title="ISO 8601 주차 — 월요일 시작, 첫 목요일이 든 주가 그 해 01주차. 01주차는 전년 12월을, 마지막 주차는 다음 해 1월을 포함할 수 있습니다."
          >
            ISO 주차 · 월~일 · {from} ~ {to}
          </span>
        ) : null}

        {meta?.source === 'MART' ? (
          <span
            className="rounded bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"
            title="mart_surgery_daily 조회 — 매일 03:00 배치가 D-1 까지 적재합니다."
          >
            마트{latestDate ? ` · 최종 ${latestDate}` : ''}
          </span>
        ) : meta?.source === 'LIVE' ? (
          <span className="rounded bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700" title="소스 라이브 조회(mssql 단독 프로파일)">
            라이브
          </span>
        ) : null}

        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-blue-600" />시력교정수술</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-violet-600" />백내장</span>
        </div>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>수술별 비중 (시술별 · {periodLabel} · {granularityLabel})</CardTitle>
        </CardHeader>
        <CardContent>
          {isError ? (
            <div className="flex h-40 items-center justify-center text-sm text-red-500">데이터를 불러오지 못했습니다.</div>
          ) : isLoading ? (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">불러오는 중…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1900px] border-collapse text-center text-[10px]">
                <CompositionHead />
                <tbody>
                  {rows.map((row) => (
                    <DataRow key={`${row.tier}-${row.label}`} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
