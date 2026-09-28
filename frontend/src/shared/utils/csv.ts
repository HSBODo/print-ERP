/**
 * 리스트 화면용 공용 CSV 유틸 — 칼럼 정의 + 행 배열을 Excel 호환 CSV로 내려받는다.
 * (월간레포트 전용 직렬화는 pages/report/monthlyReportCsv.ts에 별도로 있음)
 */

/**
 * Excel 텍스트 강제 마커 — 차트번호·전화·주민·우편번호처럼 숫자로 보이는 식별자가
 * 지수표기(1E+13)·앞자리0 손실로 깨지지 않게 ="값" 수식 형태로 출력하기 위한 표시.
 */
interface TextCell {
  excelText: string
}
const asText = (value: string): TextCell => ({ excelText: value })
const isTextCell = (v: unknown): v is TextCell =>
  typeof v === 'object' && v !== null && 'excelText' in v

/** CSV 한 셀 이스케이프 — 쉼표·따옴표·개행 포함 시 따옴표로 감싸고 내부 따옴표는 중복(""). */
const escapeCell = (value: unknown): string => {
  if (isTextCell(value)) {
    // ="값" 수식(엑셀이 텍스트로 인식). 수식 내부 따옴표 + CSV 따옴표 2중 이스케이프.
    const formula = `="${value.excelText.replace(/"/g, '""')}"`
    return `"${formula.replace(/"/g, '""')}"`
  }
  const text = value === null || value === undefined ? '' : String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** 헤더 + 행(2차원) → CSV 문자열(BOM 미포함, CRLF 구분). */
export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((cols) => cols.map(escapeCell).join(',')).join('\r\n')
}

export interface CsvColumn<T> {
  key: string
  label: string
  /** CSV 출력값. 미지정 시 row[key] 원값(표시용 변환·생략 없이 원본). */
  csv?: (row: T, rowNumber: number) => string | number
  /** true면 Excel이 숫자로 변환하지 않게 텍스트로 강제(차트번호·전화·주민·우편번호 등). */
  text?: boolean
}

/** 칼럼 정의 + 행 배열 → CSV 문자열. 표시 변환이 다른 칼럼만 csv()를 둔다. */
export function columnsToCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const headers = columns.map((c) => c.label)
  const data = rows.map((row, i) =>
    columns.map((c) => {
      const v = c.csv ? c.csv(row, i + 1) : (row as Record<string, unknown>)[c.key]
      // 텍스트 강제 칼럼은 빈 값이 아닐 때만 ="값"으로 감싼다(빈 칸은 그대로 빈 칸).
      return c.text && v !== null && v !== undefined && v !== '' ? asText(String(v)) : v
    }),
  )
  return toCsv(headers, data)
}

/** CSV 문자열에 BOM(Excel 한글 깨짐 방지)을 붙여 파일로 다운로드. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
