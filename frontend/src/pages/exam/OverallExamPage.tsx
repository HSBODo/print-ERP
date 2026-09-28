import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '#shared/ui/Card'
import { useOverallExamMonthly } from '@/hooks/overall/useOverallExamMonthly'
import type { OverallExamMonthlyItem } from '@/api/overall'

/**
 * 검사 > 월별 검사자 종합지표.
 *
 * 레거시 "총검사자" 종합표(35칼럼)를 재현한다.
 * 전 연도 마트(mart_overall_exam_monthly) 기반 — 24·25 는 V14+V16 시드, 26+ 는 배치 라이브.
 * 정의: docs/db/지표정의.md §6
 *
 * 원시 카운트는 마트에서 조회하고, 파생 산식(예약률·비율·성공률 등)은 apiItemToRow 에서 계산한다.
 * 정수 카운트는 display()에서 천 단위 구분만 입힌다.
 */

interface ColGroup {
  label: string
  cols: string[]
}

const GROUPS: ColGroup[] = [
  { label: '', cols: ['총검사자'] },
  { label: '소개유형', cols: ['일반고객', '고객소개', '직원소개'] },
  { label: '직업', cols: ['직장인', '학생', '기타'] },
  { label: '시력교정 수술예약', cols: ['예약', '예약률(중단포함)'] },
  { label: '백내장', cols: ['전체(노안포함)', '백내장 만', '중단제외', '예약', '예약률', '전환률'] },
  { label: '중단', cols: ['중단수', '중단율'] },
  { label: '검사 건수', cols: ['시력교정', '드림렌즈', '백내장', '노안2', '합계'] },
  { label: '검사 비율', cols: ['시력교정', '드림렌즈', '노안', '백내장', '노안2+5대질환'] },
  {
    label: '원데이/일반검사',
    cols: ['시력교정', '원데이', '원데이예약', '일반검사', '일반검사예약', '일반검사비율', '원데이성공률', '일반성공률'],
  },
]

// 플랫 칼럼 목록 (그룹 시작 여부 포함)
const FLAT_COLS = GROUPS.flatMap((g) =>
  g.cols.map((label, i) => ({ label, isGroupStart: i === 0 })),
)

const COL_COUNT = FLAT_COLS.length // 35

interface OverallExamRow {
  year: number
  month: number
  cells: string[] // FLAT_COLS 순서, 35개
  partial?: boolean // 월중 부분 집계(스냅샷)
}

const display = (v: string) => {
  if (v === '' || v.includes('%')) return v
  const n = Number(v.replace(/,/g, ''))
  return Number.isFinite(n) ? n.toLocaleString('ko-KR') : v
}

// 파생 산식 유틸 — 나누는 값이 0이면 공란, 아니면 소수점 1자리 %
const pct1 = (num: number, den: number): string =>
  den > 0 ? `${((num / den) * 100).toFixed(1)}%` : ''
// 정수 카운트를 문자열로
const n = (v: number): string => String(v)

/**
 * API monthly item(마트 원시 카운트) → 35 칼럼 표시 행.
 * 파생 산식: idx8/13/14/16/20~26/30~34 는 아래에서 재계산 (마트에는 원시값만 저장).
 *
 * 칼럼순(idx): 0총검사자 1일반 2고객소개 3직원소개 4직장인 5학생 6기타
 *   7시력교정예약 8예약률(중단포함) | 백내장: 9전체(노안포함) 10만 11중단제외 12예약 13예약률 14전환률
 *   중단: 15중단수 16중단율
 *   검사건수: 17시력교정 18드림렌즈 19백내장(=10) 20노안2(=9−10) 21합계(=17+18+19+20)
 *   검사비율: 22~26 = 검사건수 17~20 / 합계, 노안(24)은 현재 분류값 0
 *   원데이/일반검사: 27시력교정(=17), 28원데이, 29원데이예약, 30일반검사(=27−28),
 *     31일반검사예약(=7−29), 32일반검사비율(=30÷27), 33원데이성공률(=29÷28), 34일반성공률(=31÷30)
 */
function apiItemToRow(item: OverallExamMonthlyItem): OverallExamRow {
  const total = item.visionExam + item.dreamlens + item.cataractTotal // idx21 합계
  const nogan2 = item.cataractTotal - item.cataractOnly               // idx20
  const nomalExam = item.visionExam - item.oneDay                     // idx30
  const nomalBooked = item.visionBooked - item.oneDayBooked           // idx31

  const cells: string[] = [
    n(item.totalExam),                                    // 0
    n(item.introGeneral),                                 // 1
    n(item.introCustomer),                                // 2
    n(item.introStaff),                                   // 3
    n(item.jobOffice),                                    // 4
    n(item.jobStudent),                                   // 5
    n(item.jobEtc),                                       // 6
    n(item.visionBooked),                                 // 7
    pct1(item.visionBooked, item.visionExam),             // 8 예약률(중단포함) = 예약÷검사
    n(item.cataractTotal),                                // 9
    n(item.cataractOnly),                                 // 10
    '',                                                    // 11 중단제외 (마트에 없음)
    n(item.cataractBooked),                               // 12
    pct1(item.cataractBooked, item.cataractOnly),         // 13 예약률 = 예약÷만
    pct1(item.cataractBooked, item.cataractTotal),        // 14 전환률 = 예약÷전체
    n(item.stopCount),                                    // 15
    pct1(item.stopCount, item.visionExam),                // 16 중단율 = 중단÷검사
    n(item.visionExam),                                   // 17
    n(item.dreamlens),                                    // 18
    n(item.cataractOnly),                                 // 19 검사건수 백내장 = idx10
    n(nogan2),                                            // 20 노안2 = 전체−만
    n(total),                                             // 21 합계
    pct1(item.visionExam, total),                         // 22 시력교정 비율
    pct1(item.dreamlens, total),                          // 23 드림렌즈 비율
    '0.0%',                                               // 24 노안 비율 (현재 분류 0)
    pct1(item.cataractOnly, total),                       // 25 백내장 비율
    pct1(nogan2, total),                                  // 26 노안2+5대질환 비율
    n(item.visionExam),                                   // 27 원데이/일반검사 시력교정 = idx17
    n(item.oneDay),                                       // 28 원데이
    n(item.oneDayBooked),                                 // 29 원데이예약
    n(nomalExam),                                         // 30 일반검사
    n(nomalBooked),                                       // 31 일반검사예약
    pct1(nomalExam, item.visionExam),                     // 32 일반검사비율
    pct1(item.oneDayBooked, item.oneDay),                 // 33 원데이성공률
    pct1(nomalBooked, nomalExam),                         // 34 일반성공률
  ]

  return {
    year: item.year,
    month: item.month,
    cells,
    partial: item.partial,
  }
}

// 조회 대상 연도(2024 ~ 현재 연도). 전 연도 마트 조회.
const CURRENT_YEAR = new Date().getFullYear()
const YEARS: number[] = Array.from(
  { length: Math.max(0, CURRENT_YEAR - 2023) },
  (_, i) => 2024 + i,
)

/** 조회 연도: 'all'(전체) 또는 특정 연도 */
type YearFilter = 'all' | number

export function OverallExamPage() {
  const [year, setYear] = useState<YearFilter>('all')

  const { items } = useOverallExamMonthly(YEARS)

  const allRows = useMemo<OverallExamRow[]>(
    () => items.map(apiItemToRow),
    [items],
  )

  const rows = useMemo(
    () => (year === 'all' ? allRows : allRows.filter((r) => r.year === year)),
    [year, allRows],
  )

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[40rem] flex-col">
      <Card className="flex min-h-0 flex-1 flex-col border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>검사자 종합지표</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col">
          {/* 조회 영역 — 연도 선택(전체/연도별). 예약통계(/reservation-stats) 툴바 규격: flat white·px-2 py-1.5·text-xs */}
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-white px-2 py-1.5 text-xs shadow-sm">
            <span className="font-medium text-muted-foreground">조회 연도</span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setYear('all')}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                  year === 'all'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-border/70 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                전체
              </button>
              {YEARS.map((y) => {
                const active = year === y
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => setYear(y)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-border/70 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {y}년
                  </button>
                )
              })}
            </div>
            <span className="ml-auto text-xs text-muted-foreground">
              {year === 'all' ? '전체' : `${year}년`} · {rows.length}개월 · 가로 스크롤
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[2200px] border-collapse text-center text-xs">
              <thead>
                <tr>
                  <th rowSpan={2} className="sticky left-0 top-0 z-30 h-8 border-b border-border bg-muted px-2 font-semibold text-foreground">연도</th>
                  <th rowSpan={2} className="sticky top-0 z-20 h-8 border-b border-border bg-muted px-2 font-semibold text-foreground">월</th>
                  {GROUPS.map((g, gi) => (
                    <th
                      key={gi}
                      colSpan={g.cols.length}
                      className={`sticky top-0 z-20 h-8 border-b border-border/50 bg-muted px-2 font-semibold text-foreground ${gi > 0 ? 'border-l border-border' : ''}`}
                    >
                      {g.label}
                    </th>
                  ))}
                </tr>
                <tr className="text-[11px] text-muted-foreground">
                  {FLAT_COLS.map((c, ci) => (
                    <th
                      key={ci}
                      className={`sticky top-8 z-20 h-8 whitespace-nowrap border-b border-border bg-muted px-2 text-right font-medium ${c.isGroupStart && ci > 0 ? 'border-l border-border' : ''}`}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={COL_COUNT + 2} className="py-10 text-center text-muted-foreground">
                      표시할 데이터가 없습니다.
                    </td>
                  </tr>
                )}
                {rows.map((row, index) => {
                  const isYearStart = index > 0 && rows[index - 1].year !== row.year
                  return (
                    <tr
                      key={`${row.year}-${row.month}`}
                      className={`border-b border-border/50 ${isYearStart ? 'border-t-2 border-t-border' : ''}`}
                    >
                      <td className="sticky left-0 z-10 bg-background px-2 py-1.5 text-muted-foreground">{row.year}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground">
                        {row.month}월{row.partial ? '*' : ''}
                      </td>
                      {FLAT_COLS.map((c, ci) => (
                        <td
                          key={ci}
                          className={`whitespace-nowrap px-2 py-1.5 text-right tabular-nums ${ci === 0 ? 'font-semibold' : ''} ${c.isGroupStart && ci > 0 ? 'border-l border-border/50' : ''}`}
                        >
                          {display(row.cells[ci])}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
