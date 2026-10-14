import { useMemo } from 'react'

import { CURRENT_YEAR, MONTHS } from '#shared/constants/chart'
import { Card, CardContent, CardHeader, CardTitle } from '#shared/ui/Card'
import { formatAxisNumber } from '#shared/utils/stats'

import { isIncompleteMonth } from '../../utils/monthlyReportUtils'

/* ── 수술 상세표 (시술별, 라이브) ── */
// 뒤늦게 추가된 지표(V33 프레스비욘드·PIOL 실인원, 라섹 세부, 재수술 분해)는
// API 스키마에서 optional 이다 — 과거 캐시/시드에 값이 없을 수 있어서다. 여기서도 optional 로 맞춘다.
interface SurgeryCell {
  lasek: number
  lasik: number
  smile: number
  smilePro: number
  icl: number
  tIcl: number
  kpl: number
  tKpl: number
  viva: number
  catMulti: number
  catMono: number
  catEdof: number
  xtra: number
  waveVision: number
  monoVision: number
  contra: number
  personal: number
  reoperation: number
  visionPatients: number
  cataractPatients: number
  total: number
  lasekEx?: number
  lasekRed?: number
  presbyond?: number
  piolPatients?: number
  reopLaser?: number
  reopLens?: number
}

// 레거시 월간보고 p.27 의 항목을 모두 싣는다 — 대조할 때 빠진 칸이 없어야 한다.
//   라섹 EX/RED : 라섹의 하위 구분이라 라섹 바로 뒤
//   프레스비욘드 : 노안 레이저. 종전에는 other 로 떨어져 표에 없었다(V33 에서 분류 신설)
//   PIOL 실인원  : 양안에 다른 렌즈를 넣은 환자를 유형마다 세면 합이 실인원보다 커진다.
//                  ICL~VIVA 5종은 대표유형 기준이라 그 합 = 이 값이 된다(같아야 한다).
const VISION_COLS: { key: keyof SurgeryCell; label: string }[] = [
  { key: 'lasek', label: '라섹' },
  { key: 'lasekEx', label: '라섹EX' },
  { key: 'lasekRed', label: '라섹RED' },
  { key: 'lasik', label: '라식' },
  { key: 'smile', label: '스마일' },
  { key: 'smilePro', label: '스마일프로' },
  { key: 'presbyond', label: '프레스비욘드' },
  { key: 'piolPatients', label: 'PIOL' },
  { key: 'icl', label: 'ICL' },
  { key: 'tIcl', label: 'T-ICL' },
  { key: 'kpl', label: 'KPL' },
  { key: 'tKpl', label: 'T-KPL' },
  { key: 'viva', label: 'VIVA' },
]
// 시력교정 부가시술(add-on, 레거시 p.27 순서) + 재수술(합계·레이저·렌즈)
const ADDON_COLS: { key: keyof SurgeryCell; label: string }[] = [
  { key: 'xtra', label: '엑스트라' },
  { key: 'personal', label: '퍼스널' },
  { key: 'contra', label: '콘트라' },
  { key: 'waveVision', label: '웨이브비전' },
  { key: 'monoVision', label: '모노비전' },
  { key: 'reoperation', label: '재수술' },
  { key: 'reopLaser', label: '재수술레이저' },
  { key: 'reopLens', label: '재수술렌즈' },
]
const CATARACT_COLS: { key: keyof SurgeryCell; label: string }[] = [
  { key: 'catMulti', label: '다초점' },
  { key: 'catMono', label: '단초점' },
  { key: 'catEdof', label: 'EDOF' },
]

export function ReportSurgeryTable({
  dataMap,
}: {
  dataMap: Record<number, SurgeryCell[]>
}) {
  const rows = useMemo(() => {
    const arr = dataMap[CURRENT_YEAR] ?? []
    return arr
      .map((cell, i) => ({ month: MONTHS[i], i, cell }))
      .filter(
        (r) =>
          !isIncompleteMonth(CURRENT_YEAR, r.i) && r.cell && r.cell.total > 0,
      )
  }, [dataMap])

  if (!rows.length) return null
  const sum = (key: keyof SurgeryCell) =>
    rows.reduce((s, r) => s + (r.cell[key] || 0), 0)
  const cell = (v: number | undefined) => (v ? formatAxisNumber(v) : '')

  return (
    <Card className="report-chart flex break-inside-avoid flex-col border-border/70 shadow-sm">
      <CardHeader className="items-center pb-2">
        <CardTitle className="text-center text-lg">
          수술 상세
          <span className="text-sm font-medium text-muted-foreground">
            {' '}
            (시술별 · {CURRENT_YEAR}년)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* table-fixed + w-full 이면 칸이 눌려 머리글이 '스마일프/로' 처럼 깨진다.
            칸이 24개라 내용 너비대로 두고 부모가 가로 스크롤하게 한다. */}
        <div className="overflow-x-auto">
          <table className="w-max min-w-full border-collapse text-center text-[11px]">
            <thead>
              <tr className="border-y border-border bg-muted/40">
                <th className="whitespace-nowrap px-2 py-1.5">월</th>
                <th className="whitespace-nowrap px-2 py-1.5">총수술</th>
                <th className="whitespace-nowrap px-2 py-1.5 text-blue-700">
                  시력교정
                </th>
                {VISION_COLS.map((c) => (
                  <th key={c.key} className="whitespace-nowrap px-2 py-1.5">
                    {c.label}
                  </th>
                ))}
                {ADDON_COLS.map((c) => (
                  <th
                    key={c.key}
                    className="whitespace-nowrap px-2 py-1.5 text-emerald-700"
                  >
                    {c.label}
                  </th>
                ))}
                <th className="whitespace-nowrap px-2 py-1.5 text-violet-700">
                  백내장
                </th>
                {CATARACT_COLS.map((c) => (
                  <th key={c.key} className="whitespace-nowrap px-2 py-1.5">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.month} className="border-b border-border">
                  <td className="whitespace-nowrap px-2 py-1.5 font-semibold">
                    {r.month}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 font-semibold tabular-nums">
                    {cell(r.cell.total)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-blue-700">
                    {cell(r.cell.visionPatients)}
                  </td>
                  {VISION_COLS.map((c) => (
                    <td
                      key={c.key}
                      className="whitespace-nowrap px-2 py-1.5 tabular-nums"
                    >
                      {cell(r.cell[c.key])}
                    </td>
                  ))}
                  {ADDON_COLS.map((c) => (
                    <td
                      key={c.key}
                      className="whitespace-nowrap px-2 py-1.5 tabular-nums text-emerald-700"
                    >
                      {cell(r.cell[c.key])}
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-violet-700">
                    {cell(r.cell.cataractPatients)}
                  </td>
                  {CATARACT_COLS.map((c) => (
                    <td
                      key={c.key}
                      className="whitespace-nowrap px-2 py-1.5 tabular-nums"
                    >
                      {cell(r.cell[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                <td className="whitespace-nowrap px-2 py-1.5">합계</td>
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">
                  {cell(sum('total'))}
                </td>
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-blue-700">
                  {cell(sum('visionPatients'))}
                </td>
                {VISION_COLS.map((c) => (
                  <td
                    key={c.key}
                    className="whitespace-nowrap px-2 py-1.5 tabular-nums"
                  >
                    {cell(sum(c.key))}
                  </td>
                ))}
                {ADDON_COLS.map((c) => (
                  <td
                    key={c.key}
                    className="whitespace-nowrap px-2 py-1.5 tabular-nums text-emerald-700"
                  >
                    {cell(sum(c.key))}
                  </td>
                ))}
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums text-violet-700">
                  {cell(sum('cataractPatients'))}
                </td>
                {CATARACT_COLS.map((c) => (
                  <td
                    key={c.key}
                    className="whitespace-nowrap px-2 py-1.5 tabular-nums"
                  >
                    {cell(sum(c.key))}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          ※ 전체 수술 뷰(v_all_surgery_list) 기준 — 수술자 리스트·수술 건수·주차
          레포트와 같은 정의다. 엑스트라·웨이브비전·모노비전은 시력교정
          부가시술(환자 수 기준), 재수술은 RE_OPERATION 레코드(건) 단위. PIOL 은
          실인원 — 양안에 다른 렌즈를 넣은 환자를 유형마다 세지 않으므로
          ICL~VIVA 5종의 합과 같다. 시력교정은 사람, 백내장은 <b>안(눈)</b>{' '}
          단위라 단위가 다르다. 2026-01~05 는 확정값(골든)이다.
        </p>
      </CardContent>
    </Card>
  )
}
