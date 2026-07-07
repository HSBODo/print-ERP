import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useOverallExamMonthly } from '@/hooks/overall/useOverallExamMonthly'
import type { OverallExamMonthlyItem } from '@/api/overall'

/**
 * 전체지표 > 검사자 종합표.
 *
 * 레거시 "총검사자" 종합표(35칼럼)를 그대로 재현한다.
 * - 2024~2025: 레거시 확정값 고정 (아래 ROWS_LEGACY 상수, 원본 엑셀 TSV 기준)
 * - 2026~: 운영 DB(prod) 라이브 집계 (mart_overall_exam_monthly → useOverallExamMonthly)
 * 정의: docs/db/지표정의.md §6
 *
 * 셀 값은 원본 표기를 보존하기 위해 문자열로 저장한다(퍼센트·빈칸 포함).
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

/**
 * 24·25 레거시 확정값. 원본 엑셀 TSV 기준 문자열 그대로 저장.
 * 26년 이후는 이 배열에 없고 API(useOverallExamMonthly) 응답으로 apiItemToRow가 생성한다.
 */
const ROWS_LEGACY: OverallExamRow[] = [
  // 2024 (레거시 확정값) — 백내장 전체(노안포함)·중단제외는 원본에서 공란
  { year: 2024, month: 1, cells: ['2432','629','1561','242','904','1197','331','1642','77%','','76','','49','64%','32%','94','4.4%','2134','26','76','158','2432','87.7%','1.1%','1.6%','3.1%','6.5%','2134','1127','1016','1007','678','47%','90%','67%'] },
  { year: 2024, month: 2, cells: ['2035','576','1276','183','925','784','326','1426','79%','','64','','44','69%','39%','108','6.0%','1799','35','64','100','2035','88.4%','1.7%','1.8%','3.1%','4.9%','1799','1100','987','699','439','39%','90%','63%'] },
  { year: 2024, month: 3, cells: ['1286','385','760','141','733','234','319','800','77%','','53','','35','66%','40%','73','7.0%','1045','23','53','131','1286','81.3%','1.8%','2.6%','4.1%','10.2%','1045','573','498','472','302','45%','87%','64%'] },
  { year: 2024, month: 4, cells: ['1140','413','622','105','699','151','290','707','76%','','50','','40','80%','29%','43','4.6%','928','38','50','121','1167','79.5%','3.3%','2.6%','4.3%','10.4%','928','476','438','425','269','46%','92%','63%'] },
  { year: 2024, month: 5, cells: ['1380','526','723','131','786','270','324','919','78%','','65','','40','62%','37%','64','5.5%','1168','12','65','115','1381','84.6%','0.9%','1.5%','4.7%','8.3%','1171','640','559','529','360','45%','87%','68%'] },
  { year: 2024, month: 6, cells: ['1388','611','611','166','695','404','289','1008','80%','','43','','28','65%','38%','73','5.8%','1254','21','43','70','1388','90.3%','1.5%','0.0%','3.1%','5.0%','1254','645','566','609','442','49%','88%','73%'] },
  { year: 2024, month: 7, cells: ['1674','741','760','173','772','597','305','1150','76%','','62','','41','66%','30%','115','7.6%','1512','26','62','74','1674','90.3%','1.6%','0.0%','3.7%','4.4%','1512','744','663','768','487','51%','89%','63%'] },
  { year: 2024, month: 8, cells: ['1728','855','718','155','904','476','348','1260','80%','','51','','34','67%','26%','92','5.9%','1570','24','51','83','1728','90.9%','1.4%','0.0%','3.0%','4.8%','1570','782','689','788','571','50%','88%','72%'] },
  { year: 2024, month: 9, cells: ['1324','705','494','125','826','216','282','961','79%','','48','','30','63%','33%','61','5.0%','1219','13','48','44','1324','92.1%','1.0%','0.0%','3.6%','3.3%','1219','699','621','520','340','43%','89%','65%'] },
  { year: 2024, month: 10, cells: ['1258','777','379','102','733','216','309','850','75%','','73','','54','74%','44%','71','6.3%','1127','9','73','49','1258','89.6%','0.7%','0.0%','5.8%','3.9%','1127','620','530','507','320','45%','85%','63%'] },
  { year: 2024, month: 11, cells: ['1568','896','541','131','823','454','291','1028','72%','','70','','40','57%','29%','87','6.1%','1431','12','70','67','1580','90.6%','0.8%','0.0%','4.4%','4.2%','1431','697','608','734','420','51%','87%','57%'] },
  { year: 2024, month: 12, cells: ['2234','1304','756','174','950','971','313','1541','74%','','75','','58','77%','41%','146','7.0%','2073','18','75','68','2234','92.8%','0.8%','0.0%','3.4%','3.0%','2073','1097','957','976','584','47%','87%','60%'] },
  // 2025 (레거시 확정값)
  { year: 2025, month: 1, cells: ['2436','1390','683','363','1108','1013','315','1740','75%','117','74','63','50','68%','43%','152','6.6%','2307','12','74','43','2436','94.7%','0.5%','0.0%','3.0%','1.8%','2307','1460','1256','847','484','37%','86%','57%'] },
  { year: 2025, month: 2, cells: ['2114','1109','790','215','829','977','308','1488','76%','126','68','61','39','57%','31%','113','6%','1965','23','68','58','2114','93.0%','1.1%','0.0%','3.2%','2.7%','1965','1182','1035','783','453','40%','88%','58%'] },
  { year: 2025, month: 3, cells: ['1177','651','427','99','682','221','274','803','79%','124','76','67','45','59%','36%','46','5%','1022','31','76','48','1177','86.8%','2.6%','0.0%','6.5%','4.1%','1022','616','534','406','269','40%','87%','66%'] },
  { year: 2025, month: 4, cells: ['1124','616','419','89','675','162','287','776','77%','101','59','45','29','49%','29%','45','4%','1002','21','59','42','1124','89.1%','1.9%','0.0%','5.2%','3.7%','1002','533','471','469','305','47%','88%','65%'] },
  { year: 2025, month: 5, cells: ['1256','650','460','146','741','226','289','853','76%','116','55','47','32','58%','28%','49','4%','1118','22','55','61','1256','89.0%','1.8%','0.0%','4.4%','4.9%','1118','627','536','491','316','44%','85%','64%'] },
  { year: 2025, month: 6, cells: ['1132','500','520','112','594','337','201','802','75%','103','55','48','24','44%','23%','71','7%','1076','32','55','48','1211','88.9%','2.6%','0.0%','4.5%','4.0%','1076','519','455','557','347','52%','88%','62%'] },
  { year: 2025, month: 7, cells: ['1291','573','606','112','617','441','233','861','77%','135','74','63','41','55%','30%','48','4%','1124','32','74','61','1291','87.1%','2.5%','0.0%','5.7%','4.7%','1124','577','503','547','358','49%','87%','65%'] },
  { year: 2025, month: 8, cells: ['1337','671','551','115','709','366','262','890','77%','146','78','64','49','63%','34%','62','5%','1154','37','78','68','1337','86%','2.8%','0.0%','5.8%','5.1%','1154','604','540','550','354','48%','89%','64%'] },
  { year: 2025, month: 9, cells: ['1190','616','492','82','763','179','248','810','76%','105','76','62','43','57%','41%','35','3%','1071','15','76','29','1191','90%','1%','0%','6%','2%','1071','459','421','612','389','57%','92%','64%'] },
  { year: 2025, month: 10, cells: ['1357','767','496','94','1001','155','201','1015','82%','104','66','57','36','55%','35%','42','3%','1245','8','66','38','1357','92%','1%','0%','5%','3%','1245','867','786','378','229','30%','91%','61%'] },
  { year: 2025, month: 11, cells: ['1085','564','434','87','551','419','115','762','77%','81','53','44','30','57%','37%','39','4%','991','13','53','28','1085','91%','1%','0%','5%','3%','991','495','448','496','314','50%','91%','63%'] },
  { year: 2025, month: 12, cells: ['1860','981','740','139','729','876','255','1268','75%','151','96','80','53','55%','35%','86','5%','1702','7','96','55','1860','92%','0%','0%','5%','3%','1702','785','703','917','565','54%','90%','62%'] },
]

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
 * API monthly item(2026+ 마트 원시 카운트) → 35 칼럼 표시 행.
 * 파생 산식: idx8/13/14/16/20~26/30~34 는 아래에서 재계산 (백엔드 mart에는 원시값만 저장).
 * 24·25 레거시 하드코딩의 산식과 일부 세부(예: 24년 백내장 전체 공란)가 다를 수 있음 —
 * 26+ 는 여기 규칙을 정본으로 삼는다.
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

// 조회할 "라이브" 연도(2026 ~ 현재 연도). 프론트 하드코딩된 레거시 연도(2024·2025)는 제외.
const CURRENT_YEAR = new Date().getFullYear()
const LIVE_YEARS: number[] = Array.from(
  { length: Math.max(0, CURRENT_YEAR - 2025) },
  (_, i) => 2026 + i,
)

// 조회 영역 버튼용 연도 목록
const LEGACY_YEARS = [2024, 2025]
const YEARS = [...LEGACY_YEARS, ...LIVE_YEARS]

/** 조회 연도: 'all'(전체) 또는 특정 연도 */
type YearFilter = 'all' | number

export function OverallExamPage() {
  const [year, setYear] = useState<YearFilter>('all')

  const { items: liveItems } = useOverallExamMonthly(LIVE_YEARS)

  const liveRows = useMemo(
    () => liveItems.map(apiItemToRow),
    [liveItems],
  )

  const allRows = useMemo(
    () => [...ROWS_LEGACY, ...liveRows],
    [liveRows],
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
