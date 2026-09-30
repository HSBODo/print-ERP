import { useMemo, useState } from 'react'

import { CURRENT_YEAR } from '#shared/constants/chart'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#shared/ui/Card'

import { useOverallExamWeekly } from '../../hooks/useOverallExamWeekly'
import type { OverallExamWeeklyItem } from '../../type/api'

/**
 * 검사 > 주간 검사자 종합지표.
 *
 * 월별 "검사자 종합지표"와 동일한 9블록 35칼럼을, 주(월~일) 단위로 운영 DB에서 라이브 집계한다.
 * 주 정의: 월요일~일요일, 월 경계를 걸치는 주는 각 달로 잘라 귀속.
 *   1일~첫 월요일 직전의 선행 부분 구간은 첫 정규 주에 합쳐 1주로 만든다(마지막 주만 부분 주 가능).
 *   예) 2026-02(1일=일): 1주 02.01~08, 2주 09~15 ...  (정의: docs/db/지표정의.md §6)
 *
 * 월별 표는 2024~2025 레거시 고정값을 쓰지만, 주 단위는 분해 불가하므로 전 구간 DB 라이브다.
 * 파생 칼럼(예약률·비율·성공률)은 백엔드 원시 집계로 화면에서 계산한다.
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
  {
    label: '백내장',
    cols: [
      '전체(노안포함)',
      '백내장 만',
      '중단제외',
      '예약',
      '예약률',
      '전환률',
    ],
  },
  { label: '중단', cols: ['중단수', '중단율'] },
  {
    label: '검사 건수',
    cols: ['시력교정', '드림렌즈', '백내장', '노안2', '합계'],
  },
  {
    label: '검사 비율',
    cols: ['시력교정', '드림렌즈', '노안', '백내장', '노안2+5대질환'],
  },
  {
    label: '원데이/일반검사',
    cols: [
      '시력교정',
      '원데이',
      '원데이예약',
      '일반검사',
      '일반검사예약',
      '일반검사비율',
      '원데이성공률',
      '일반성공률',
    ],
  },
]

const FLAT_COLS = GROUPS.flatMap((g) =>
  g.cols.map((label, i) => ({ label, isGroupStart: i === 0 })),
)

const YEAR_OPTIONS = [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR]

/** 정수 카운트 천 단위 표시. */
const num = (v: number) => v.toLocaleString('ko-KR')

/** 비율(%) 표시. 분모 0이면 공란. */
const pct = (numerator: number, denominator: number, decimals = 0) =>
  denominator > 0
    ? `${((numerator / denominator) * 100).toFixed(decimals)}%`
    : ''

/** 한 주 항목을 35칼럼 셀 문자열 배열로 변환 (월별 종합표와 동일한 산식). */
function buildCells(it: OverallExamWeeklyItem): string[] {
  const noan2 = it.cataractTotal - it.cataractOnly
  const examTotal = it.visionExam + it.dreamlens + it.cataractOnly + noan2
  const general = it.visionExam - it.oneDay
  const generalBooked = it.visionBooked - it.oneDayBooked

  return [
    num(it.totalExam), // 0  총검사자
    num(it.introGeneral), // 1  소개유형 일반
    num(it.introCustomer), // 2  고객소개
    num(it.introStaff), // 3  직원소개
    num(it.jobOffice), // 4  직장인
    num(it.jobStudent), // 5  학생
    num(it.jobEtc), // 6  기타
    num(it.visionBooked), // 7  시력교정 수술예약
    pct(it.visionBooked, it.visionExam + it.stopCount), // 8  예약률(중단포함)
    num(it.cataractTotal), // 9  백내장 전체(노안포함)
    num(it.cataractOnly), // 10 백내장 만
    '', // 11 중단제외 (정의 미확정)
    num(it.cataractBooked), // 12 백내장 예약
    pct(it.cataractBooked, it.cataractOnly), // 13 백내장 예약률
    '', // 14 전환률 (정의 미확정)
    num(it.stopCount), // 15 중단수
    pct(it.stopCount, it.visionExam, 1), // 16 중단율
    num(it.visionExam), // 17 검사건수 시력교정
    num(it.dreamlens), // 18 검사건수 드림렌즈
    num(it.cataractOnly), // 19 검사건수 백내장
    num(noan2), // 20 노안2
    num(examTotal), // 21 합계
    pct(it.visionExam, examTotal, 1), // 22 비율 시력교정
    pct(it.dreamlens, examTotal, 1), // 23 비율 드림렌즈
    '0.0%', // 24 비율 노안 (현재 분류값 0)
    pct(it.cataractOnly, examTotal, 1), // 25 비율 백내장
    pct(noan2, examTotal, 1), // 26 비율 노안2+5대질환
    num(it.visionExam), // 27 원데이/일반 시력교정
    num(it.oneDay), // 28 원데이
    num(it.oneDayBooked), // 29 원데이예약
    num(general), // 30 일반검사
    num(generalBooked), // 31 일반검사예약
    pct(general, it.visionExam), // 32 일반검사비율
    pct(it.oneDayBooked, it.oneDay), // 33 원데이성공률
    pct(generalBooked, general), // 34 일반성공률
  ]
}

/** 기간 라벨: 06.08~06.14 */
const rangeLabel = (start: string, end: string) =>
  `${start.slice(5).replace('-', '.')}~${end.slice(5).replace('-', '.')}`

export function OverallExamWeeklyPage() {
  const [years, setYears] = useState<number[]>([CURRENT_YEAR])
  const { items, isLoading, isError } = useOverallExamWeekly(years)

  const rows = useMemo(
    () =>
      [...items]
        .sort((a, b) => a.year - b.year || a.month - b.month || a.week - b.week)
        .map((it) => ({ it, cells: buildCells(it) })),
    [items],
  )

  const toggleYear = (year: number) =>
    setYears((prev) =>
      prev.includes(year)
        ? prev.filter((y) => y !== year)
        : [...prev, year].sort(),
    )

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[40rem] flex-col">
      <Card className="flex min-h-0 flex-1 flex-col border-border/70 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>주간 검사자 종합지표</CardTitle>
              <CardDescription>
                월별 종합표와 동일한 35칼럼을 주(월~일) 단위로 운영 DB에서
                라이브 집계합니다. 월 경계를 걸친 주는 각 달로 잘라 귀속하며,
                첫·마지막 주는 부분 주(*)가 될 수 있습니다. (가로로
                스크롤하세요)
              </CardDescription>
            </div>
            <div className="flex shrink-0 gap-1.5">
              {YEAR_OPTIONS.map((year) => {
                const active = years.includes(year)
                return (
                  <button
                    key={year}
                    type="button"
                    onClick={() => toggleYear(year)}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-border/70 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {year}
                  </button>
                )
              })}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full min-w-[2300px] border-collapse text-center text-xs">
              <thead>
                <tr>
                  <th
                    rowSpan={2}
                    className="sticky left-0 top-0 z-30 h-8 border-b border-border bg-muted px-2 font-semibold text-foreground"
                  >
                    연도
                  </th>
                  <th
                    rowSpan={2}
                    className="sticky top-0 z-20 h-8 border-b border-border bg-muted px-2 font-semibold text-foreground"
                  >
                    월
                  </th>
                  <th
                    rowSpan={2}
                    className="sticky top-0 z-20 h-8 border-b border-border bg-muted px-2 font-semibold text-foreground"
                  >
                    주
                  </th>
                  <th
                    rowSpan={2}
                    className="sticky top-0 z-20 h-8 whitespace-nowrap border-b border-border bg-muted px-2 font-semibold text-foreground"
                  >
                    기간
                  </th>
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
                {isLoading && (
                  <tr>
                    <td
                      colSpan={FLAT_COLS.length + 4}
                      className="py-10 text-center text-muted-foreground"
                    >
                      불러오는 중…
                    </td>
                  </tr>
                )}
                {isError && !isLoading && (
                  <tr>
                    <td
                      colSpan={FLAT_COLS.length + 4}
                      className="py-10 text-center text-red-500"
                    >
                      데이터를 불러오지 못했습니다.
                    </td>
                  </tr>
                )}
                {!isLoading && !isError && rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={FLAT_COLS.length + 4}
                      className="py-10 text-center text-muted-foreground"
                    >
                      표시할 데이터가 없습니다. 연도를 선택하세요.
                    </td>
                  </tr>
                )}
                {rows.map(({ it, cells }, index) => {
                  const prev = index > 0 ? rows[index - 1].it : null
                  const isYearStart = prev !== null && prev.year !== it.year
                  const isMonthStart =
                    prev !== null &&
                    (prev.year !== it.year || prev.month !== it.month)
                  return (
                    <tr
                      key={`${it.year}-${it.month}-${it.week}`}
                      className={`border-b border-border/50 ${isYearStart ? 'border-t-2 border-t-border' : isMonthStart ? 'border-t border-t-border/70' : ''}`}
                    >
                      <td className="sticky left-0 z-10 bg-background px-2 py-1.5 text-muted-foreground">
                        {it.year}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground">
                        {it.month}월
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground">
                        {it.week}주{it.partial ? '*' : ''}
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground tabular-nums">
                        {rangeLabel(it.startDate, it.endDate)}
                      </td>
                      {FLAT_COLS.map((c, ci) => (
                        <td
                          key={ci}
                          className={`whitespace-nowrap px-2 py-1.5 text-right tabular-nums ${ci === 0 ? 'font-semibold' : ''} ${c.isGroupStart && ci > 0 ? 'border-l border-border/50' : ''}`}
                        >
                          {cells[ci]}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 shrink-0 text-xs leading-relaxed text-muted-foreground">
            * 주 = 월요일~일요일. 1일~첫 월요일 직전의 선행 구간은 첫 정규 주에
            합쳐 1주로 만들며(예: 2월 1주 = 02.01~02.08), 마지막 주만 부분
            주(*)일 수 있습니다. 월 경계를 걸친 주는 각 달로 잘라 귀속합니다(월
            합계 = 그 달 주 합계).
            <br />※ 전 구간 <b>운영 DB 라이브</b> 집계입니다(EXAM·Cataract_Exam
            스냅샷 특성상 과거 주 수치가 사후 미세 변동 가능). <b>총검사자</b>
            =검사수(EXAM 행+Cataract_Exam 세션), <b>백내장 전체(노안포함)</b>
            =Cataract_Exam 세션수, <b>만</b>=추천 눈 수, <b>노안2</b>=전체−만.
            <br />※ <b>소개유형</b>은 우리 DB 기준(고객소개=MOTIVE_NEW02
            소개고객)이라 레거시 월별 표와 차이가 있을 수 있습니다(지표정의
            §6.3). <b>백내장 중단제외·전환률</b>은 정의 미확정으로 공란입니다.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
