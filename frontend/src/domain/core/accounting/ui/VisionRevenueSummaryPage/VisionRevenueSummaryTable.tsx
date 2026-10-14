import {
  summaryCardTotal,
  summaryRowValues,
  summaryTotal,
  VISION_SUMMARY_ROWS,
  type VisionRevenueSummary,
  type VisionSummaryRowDefinition,
} from './visionRevenueSummaryModel'

const toneClasses = {
  free: 'bg-[#ffff00] text-gray-900',
  count: 'bg-white text-gray-400',
  taxed: 'bg-[#fce4d6] text-gray-900',
  sum: 'bg-[#b8cce4] font-bold text-gray-900',
  freeSum: 'bg-[#fdf3d7] font-bold text-gray-900',
  taxedSum: 'bg-[#d8e9d2] font-bold text-gray-900',
  derived: 'bg-gray-50 italic text-gray-700',
} as const

const formatted = (value: number): string =>
  value === 0 ? '' : Math.round(value).toLocaleString('ko-KR')

function AmountCells({
  summary,
  values,
}: {
  summary: VisionRevenueSummary
  values: number[]
}) {
  return (
    <>
      <td className="border border-gray-300 px-2.5 py-1 text-right tabular-nums">
        {formatted(values[0])}
      </td>
      <td className="border border-gray-300 px-2.5 py-1 text-right tabular-nums">
        {formatted(summaryCardTotal(summary, values))}
      </td>
      {values.slice(1).map((value, index) => (
        <td
          key={summary.columns[index + 1]}
          className="border border-gray-300 px-2.5 py-1 text-right tabular-nums"
        >
          {formatted(value)}
        </td>
      ))}
      <td className="border border-l-2 border-dashed border-l-red-600 border-y-gray-300 border-r-gray-300 px-2.5 py-1 text-right tabular-nums">
        {formatted(summaryTotal(values))}
      </td>
    </>
  )
}

function DetailRow({
  summary,
  row,
}: {
  summary: VisionRevenueSummary
  row: VisionSummaryRowDefinition
}) {
  const values = summaryRowValues(summary, row)
  return (
    <tr className={toneClasses[row.kind]}>
      <td className="sticky left-0 z-[2] border border-gray-300 bg-inherit px-3 py-1 font-semibold">
        {row.label}
      </td>
      <AmountCells summary={summary} values={values} />
    </tr>
  )
}

function TotalRow({
  summary,
  label,
  values,
  tone,
}: {
  summary: VisionRevenueSummary
  label: string
  values: number[]
  tone: 'sum' | 'freeSum' | 'taxedSum' | 'derived'
}) {
  return (
    <tr className={toneClasses[tone]}>
      <td className="sticky left-0 z-[2] border border-gray-300 bg-inherit px-3 py-1">
        {label}
      </td>
      <AmountCells summary={summary} values={values} />
    </tr>
  )
}

const valuesOf = (
  summary: VisionRevenueSummary,
  source: Record<string, number>,
): number[] => summary.columns.map((column) => source[column])

export function VisionRevenueSummaryTable({
  summary,
  showZeroRows,
}: {
  summary: VisionRevenueSummary
  showZeroRows: boolean
}) {
  const rows = showZeroRows
    ? VISION_SUMMARY_ROWS
    : VISION_SUMMARY_ROWS.filter(
        (row) => row.key && summaryTotal(summaryRowValues(summary, row)) !== 0,
      )
  const all = valuesOf(summary, summary.columnTotals)
  const free = valuesOf(summary, summary.freeTotals)
  const taxed = valuesOf(summary, summary.taxedTotals)
  const supply = taxed.map((value) => value / 1.1)
  const vat = taxed.map((value, index) => value - supply[index])

  return (
    <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-[#dbe5f1] text-gray-900">
            <th className="sticky left-0 top-0 z-20 min-w-[150px] border border-gray-300 bg-[#dbe5f1] px-3 py-1.5 text-left">
              값
            </th>
            <th className="sticky top-0 z-10 min-w-[100px] border border-gray-300 bg-[#dbe5f1] px-2.5 py-1.5 text-center">
              현금
            </th>
            <th className="sticky top-0 z-10 min-w-[110px] border border-gray-300 bg-[#dbe5f1] px-2.5 py-1.5 text-center">
              카드 계
            </th>
            {summary.columns.slice(1).map((column) => (
              <th
                key={column}
                className="sticky top-0 z-10 min-w-[100px] border border-gray-300 bg-[#dbe5f1] px-2.5 py-1.5 text-center"
              >
                {column}
              </th>
            ))}
            <th className="sticky top-0 z-10 min-w-[112px] border border-l-2 border-dashed border-l-red-600 border-y-gray-300 border-r-gray-300 bg-[#dbe5f1] px-2.5 py-1.5 text-center">
              총합계
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <DetailRow key={row.label} summary={summary} row={row} />
          ))}
          <TotalRow summary={summary} label="총합계" values={all} tone="sum" />
          <tr aria-hidden="true">
            <td
              colSpan={summary.columns.length + 3}
              className="h-1.5 border-x border-gray-300 bg-white p-0"
            />
          </tr>
          <TotalRow
            summary={summary}
            label="면세합계"
            values={free}
            tone="freeSum"
          />
          <tr aria-hidden="true">
            <td
              colSpan={summary.columns.length + 3}
              className="h-1.5 border-x border-gray-300 bg-white p-0"
            />
          </tr>
          <TotalRow
            summary={summary}
            label="과세합계"
            values={taxed}
            tone="taxedSum"
          />
          <TotalRow
            summary={summary}
            label="과세 공급가액 (÷1.1)"
            values={supply}
            tone="derived"
          />
          <TotalRow
            summary={summary}
            label="부가세"
            values={vat}
            tone="derived"
          />
        </tbody>
      </table>
    </div>
  )
}
