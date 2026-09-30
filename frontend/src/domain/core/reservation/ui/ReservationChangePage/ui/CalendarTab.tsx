import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '#shared/ui/Button'
import { Card, CardContent } from '#shared/ui/Card'

import { useReservationChangeDaily } from '../../../hooks/useReservationChange'
import {
  BASIS_LABEL,
  buildCalendar,
  type CalendarBasis,
  type CalendarMetric,
  calendarRange,
  METRIC_LABEL,
  shiftMonth,
} from '../utils/reservationChangeCalendarModel'
import { BRANCH_LABEL } from '../utils/reservationChangeModel'
import { Segment, Stat } from './FilterControls'
import { ReservationChangeCalendar } from './ReservationChangeCalendar'

const DATA_FROM_YEAR = 2022
const pad = (n: number) => String(n).padStart(2, '0')
const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const currentMonth = () => todayIso().slice(0, 7)
const monthLabel = (ym: string) =>
  `${ym.slice(0, 4)}년 ${Number(ym.slice(5))}월`

const BRANCH_OPTIONS = [
  { value: '', label: '전체' },
  ...Object.entries(BRANCH_LABEL).map(([value, label]) => ({ value, label })),
]

/**
 * 추이 달력 탭 — 선택 월 + 다음 달 두 장을 세로로. 일별 등록 · 변경 · 변경률.
 * 기준(등록일 / 예약일) 두 축 · 지표 3종 · 구분(M/D/H) 로 필터.
 */
export function CalendarTab() {
  const [calMonth, setCalMonth] = useState(currentMonth())
  const [basis, setBasis] = useState<CalendarBasis>('rsv')
  const [metric, setMetric] = useState<CalendarMetric>('total')
  const [calBranch, setCalBranch] = useState('')

  // 두 달 그리드 범위(최대 11주) 를 한 번에 조회.
  const calMonths = useMemo(
    () => [calMonth, shiftMonth(calMonth, 1)],
    [calMonth],
  )
  const calRange = useMemo(
    () => ({
      from: calendarRange(calMonths[0]).from,
      to: calendarRange(calMonths[1]).to,
    }),
    [calMonths],
  )
  const daily = useReservationChangeDaily(calRange.from, calRange.to)
  const calendars = useMemo(() => {
    const rows =
      basis === 'reg' ? daily.daily.byRegistered : daily.daily.byReserveDate
    return calMonths.map((m) => buildCalendar(m, rows, calBranch))
  }, [calMonths, basis, daily.daily, calBranch])
  const calLoading = daily.isLoading || daily.isFetching

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border/70 bg-white px-1.5 py-1 shadow-sm">
        <div className="flex h-8 items-center overflow-hidden rounded-md border border-border/80 bg-white">
          <button
            type="button"
            aria-label="이전 달"
            onClick={() => setCalMonth((m) => shiftMonth(m, -1))}
            className="h-full px-1.5 text-gray-600 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <input
            type="month"
            aria-label="달력 월"
            value={calMonth}
            min={`${DATA_FROM_YEAR}-01`}
            onChange={(e) => e.target.value && setCalMonth(e.target.value)}
            className="h-full border-x border-border/70 px-2 text-xs font-semibold text-gray-800 outline-none"
          />
          <button
            type="button"
            aria-label="다음 달"
            onClick={() => setCalMonth((m) => shiftMonth(m, 1))}
            className="h-full px-1.5 text-gray-600 hover:bg-gray-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => setCalMonth(currentMonth())}
        >
          이번 달
        </Button>
        <span className="mx-1 h-6 w-px bg-gray-200" />
        <Segment
          value={basis}
          onChange={setBasis}
          options={(Object.keys(BASIS_LABEL) as CalendarBasis[]).map((v) => ({
            value: v,
            label: BASIS_LABEL[v],
          }))}
        />
        <Segment
          value={metric}
          onChange={setMetric}
          options={(Object.keys(METRIC_LABEL) as CalendarMetric[]).map((v) => ({
            value: v,
            label: METRIC_LABEL[v],
          }))}
        />
        <Segment
          value={calBranch}
          onChange={setCalBranch}
          options={BRANCH_OPTIONS}
        />
      </div>
      <Card className="min-h-0 flex-1 border-border/70 py-0 shadow-sm">
        <CardContent className="flex h-full min-h-0 flex-col px-0">
          {daily.isError ? (
            <div className="flex flex-1 items-center justify-center px-3 text-sm text-red-500">
              추이 달력 데이터를 불러오지 못했습니다.
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto rounded-lg">
              {calendars.map((calendar) => (
                <section
                  key={calendar.yearMonth}
                  className="border-b border-border/60 last:border-b-0"
                >
                  <div className="flex flex-wrap items-center gap-1.5 px-2 py-1">
                    <h3 className="mr-1 text-[13px] font-bold text-gray-900">
                      {monthLabel(calendar.yearMonth)}
                    </h3>
                    <Stat
                      label="등록"
                      value={`${calendar.total.toLocaleString('ko-KR')}건`}
                      accent="text-blue-700"
                    />
                    <Stat
                      label="변경"
                      value={`${calendar.changed.toLocaleString('ko-KR')}건`}
                      accent="text-red-600"
                    />
                    <Stat
                      label="변경률"
                      value={
                        calendar.rate === null
                          ? '—'
                          : `${calendar.rate.toFixed(1)}%`
                      }
                      accent="text-violet-700"
                    />
                    {!calLoading && calendar.total === 0 && (
                      <span className="text-[11px] text-muted-foreground">
                        집계된 예약이 없습니다 — 마트 적재(관리자 배치 · 예약
                        변경이력만) 범위를 확인해 주세요.
                      </span>
                    )}
                  </div>
                  <ReservationChangeCalendar
                    view={calendar}
                    metric={metric}
                    loading={calLoading}
                  />
                </section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
