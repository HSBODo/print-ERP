import { useMemo, useState } from 'react'
import { CartesianGrid, LabelList, Line, LineChart, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { formatWonCompact } from './accountingModel'
import { MONTH_LABELS, rowTotal, type MonthlyChartView } from './accountingChartModel'

const fullNumber = (value: number) => Math.round(value).toLocaleString('ko-KR')

export function AccountingMonthlyChart({ title, description, view }: { title: string; description: string; view: MonthlyChartView }) {
  const [focused, setFocused] = useState<string | null>(null)
  const config = useMemo(() => Object.fromEntries(view.lines.map((line) => [line.key, { label: line.label, color: line.color }])) as ChartConfig, [view.lines])
  const data = useMemo(() => MONTH_LABELS.map((month, index) => ({ month, ...Object.fromEntries(view.lines.map((line) => [line.key, line.values[index]])) })), [view.lines])
  const mainKey = focused && view.lines.some((line) => line.key === focused) ? focused : view.lines.find((line) => line.main)?.key

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-sm font-bold text-gray-900">{title}</h2><p className="mt-1 text-[11px] text-gray-500">{description}</p></div><div className="flex flex-wrap gap-3">{view.lines.map((line) => <button type="button" key={line.key} onClick={() => setFocused((current) => current === line.key ? null : line.key)} className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs ${mainKey === line.key ? 'font-bold' : 'text-gray-700'}`} style={{ color: mainKey === line.key ? line.color : undefined }}><i className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: line.color }} />{line.label}</button>)}</div></div></div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="min-w-[1000px] px-2 pt-2">
          <ChartContainer config={config} className="h-[310px] w-full">
            <LineChart data={data} margin={{ top: 24, right: 35, bottom: 8, left: 22 }}>
              <CartesianGrid vertical={false} stroke="#ECEEF1" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis width={72} tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatWonCompact} />
              <ChartTooltip content={<ChartTooltipContent formatter={(value) => fullNumber(Number(value))} />} />
              {view.lines.map((line) => <Line key={line.key} type="monotone" dataKey={line.key} stroke={`var(--color-${line.key})`} strokeWidth={mainKey === line.key ? 3 : 2} dot={{ r: mainKey === line.key ? 3.5 : 2.5, fill: '#fff' }} connectNulls={false}>{mainKey === line.key && <LabelList dataKey={line.key} position="bottom" offset={10} formatter={(value: unknown) => value == null ? '' : formatWonCompact(Number(value))} className="fill-current text-[10px] font-bold" />}</Line>)}
            </LineChart>
          </ChartContainer>
        </div>
        <table className="min-w-[1000px] table-fixed border-collapse text-[11px]"><thead><tr className="bg-gray-50"><th className="w-28 border border-gray-200 px-2 py-1.5" />{MONTH_LABELS.map((month) => <th key={month} className="border border-gray-200 px-2 py-1.5 text-center font-semibold text-gray-600">{month}</th>)}<th className="w-28 border border-gray-200 px-2 py-1.5 text-right font-semibold text-gray-700">합계</th></tr></thead><tbody>{view.tableRows.map((row) => <tr key={row.key} className={row.key === mainKey ? 'bg-amber-50/50 font-semibold' : ''}><td className="whitespace-nowrap border border-gray-200 px-2.5 py-1.5 font-semibold" style={{ color: row.color }}>{row.label}</td>{row.values.map((value, index) => <td key={`${row.key}-${index}`} className="border border-gray-200 px-2 py-1.5 text-right tabular-nums text-gray-700">{value == null ? '' : fullNumber(value)}</td>)}<td className="border border-gray-200 px-2.5 py-1.5 text-right font-bold tabular-nums">{fullNumber(rowTotal(row))}</td></tr>)}</tbody></table>
      </div>
    </div>
  )
}
