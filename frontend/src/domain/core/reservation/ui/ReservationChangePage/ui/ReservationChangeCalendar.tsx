import { formatMetric, metricValue, type CalendarMetric, type CalendarView, type DayCell } from '../utils/reservationChangeCalendarModel'

/**
 * 추이 달력 — 월~일 7열 + 주차 열 + 주 합계 열. 셀마다 선택 지표를 크게, 등록·변경을 작게 보여주고
 * 그 달 최대값 대비 농도로 히트 색을 칠한다. 명절 창(당일 ±5일)은 은은한 호박색, 당일은 라벨.
 */

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']
/** 지표별 히트 색 (r,g,b) — 등록 파랑 · 변경 빨강 · 변경률 보라 (변경 상세의 최초/최종/기준일 색과 맞춤) */
const HEAT: Record<CalendarMetric, string> = { total: '59,130,246', changed: '225,29,46', rate: '124,58,237' }

const heatStyle = (cell: DayCell, metric: CalendarMetric, max: number) => {
  const value = metricValue(cell, metric)
  if (!cell.inMonth || !value || max <= 0) return undefined
  const alpha = 0.07 + 0.45 * Math.min(1, value / max)
  return { backgroundColor: `rgba(${HEAT[metric]},${alpha.toFixed(3)})` }
}

const dayNumberClass = (cell: DayCell) => {
  if (!cell.inMonth) return 'text-gray-300'
  if (cell.weekday === 6) return 'text-red-500'
  if (cell.weekday === 5) return 'text-blue-500'
  return 'text-gray-700'
}

const TH = 'border-b border-border/60 bg-gray-50 px-2 py-1 text-center text-[11px] font-semibold text-gray-600'

export function ReservationChangeCalendar({ view, metric, loading }: { view: CalendarView; metric: CalendarMetric; loading: boolean }) {
  const max = view.max[metric]
  return (
    <table className="w-full table-fixed border-collapse text-[11px]">
      <colgroup>
        <col className="w-14" />
        {WEEKDAYS.map((d) => <col key={d} />)}
        <col className="w-28" />
      </colgroup>
      <thead>
        <tr>
          <th className={TH}>주차</th>
          {WEEKDAYS.map((d, i) => (
            <th key={d} className={`${TH} ${i === 6 ? 'text-red-500' : i === 5 ? 'text-blue-500' : ''}`}>{d}</th>
          ))}
          <th className={TH}>주 합계</th>
        </tr>
      </thead>
      <tbody className={loading ? 'opacity-40' : ''}>
        {view.weeks.map((week) => (
          <tr key={week.key} className="border-b border-border/40">
            <td className="border-r border-border/40 bg-gray-50/60 px-1 text-center text-[10.5px] text-gray-500">
              W{week.isoWeek}
              {week.isoYear !== Number(view.yearMonth.slice(0, 4)) && <span className="block text-[9.5px] text-gray-400">({String(week.isoYear).slice(2)})</span>}
            </td>
            {week.days.map((cell) => {
              const value = metricValue(cell, metric)
              return (
                <td
                  key={cell.date}
                  style={heatStyle(cell, metric, max)}
                  className={`h-[3.6rem] border-r border-border/40 px-1.5 py-0.5 align-top ${cell.inMonth ? '' : 'bg-gray-50/70'} ${cell.holiday && cell.inMonth ? 'ring-1 ring-inset ring-amber-200' : ''}`}
                  title={`${cell.date} · 등록 ${cell.total.toLocaleString('ko-KR')} · 변경 ${cell.changed.toLocaleString('ko-KR')}${cell.rate === null ? '' : ` · 변경률 ${cell.rate.toFixed(1)}%`}${cell.holiday ? ` · ${cell.holiday}` : ''}`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className={`text-[11px] font-semibold tabular-nums ${dayNumberClass(cell)}`}>{cell.dayOfMonth}</span>
                    {cell.holidayDay && cell.inMonth && (
                      <span className="rounded bg-amber-100 px-1 text-[9.5px] font-medium text-amber-800">{cell.holidayDay}</span>
                    )}
                  </div>
                  {cell.inMonth ? (
                    <>
                      <div className={`text-right text-[14px] font-bold tabular-nums leading-tight ${value ? 'text-gray-900' : 'text-gray-300'}`}>
                        {value ? formatMetric(value, metric) : cell.total || cell.changed ? formatMetric(value, metric) : '0'}
                      </div>
                      <div className="text-right text-[10px] tabular-nums text-gray-500">
                        등록 {cell.total.toLocaleString('ko-KR')} · 변경 {cell.changed.toLocaleString('ko-KR')}
                      </div>
                    </>
                  ) : (
                    <div className="mt-0.5 text-right text-[10px] tabular-nums text-gray-300">
                      {cell.total || cell.changed ? `${cell.total.toLocaleString('ko-KR')} · ${cell.changed.toLocaleString('ko-KR')}` : ''}
                    </div>
                  )}
                </td>
              )
            })}
            <td className="bg-gray-50/60 px-2 py-1 text-right align-top tabular-nums">
              <div className="text-[12.5px] font-bold text-gray-900">{formatMetric(metricValue(week, metric), metric) || '—'}</div>
              <div className="text-[10px] text-gray-500">등록 {week.total.toLocaleString('ko-KR')} · 변경 {week.changed.toLocaleString('ko-KR')}</div>
              <div className="text-[10px] text-gray-500">{week.rate === null ? '' : `변경률 ${week.rate.toFixed(1)}%`}</div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
