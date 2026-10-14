import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useFilter } from '#shared/hooks/useFilter'
import { Button } from '#shared/ui/Button'
import { Card, CardContent } from '#shared/ui/Card'
import { Filter } from '#shared/ui/Filter'
import { currentMonth, shiftMonth } from '#shared/utils/date'

import { useReservationChangeDaily } from '../../../hooks/useReservationChange'
import {
  BASIS_LABEL,
  buildCalendar,
  type CalendarBasis,
  type CalendarMetric,
  calendarRange,
  METRIC_LABEL,
} from '../utils/reservationChangeCalendarModel'
import { BRANCH_LABEL, DATA_FROM_YEAR } from '../utils/reservationChangeModel'
import { ReservationChangeCalendar } from './ReservationChangeCalendar'
import { Stat } from './Stat'

const monthLabel = (ym: string) =>
  `${ym.slice(0, 4)}년 ${Number(ym.slice(5))}월`
/** 예약일 기준은 미래 달도 잡혀 있어 1년 뒤까지 넘겨 볼 수 있다 */
const maxMonth = () => shiftMonth(currentMonth(), 12)

const BASIS_OPTIONS = (Object.keys(BASIS_LABEL) as CalendarBasis[]).map(
  (value) => ({ value, label: BASIS_LABEL[value] }),
)
const METRIC_OPTIONS = (Object.keys(METRIC_LABEL) as CalendarMetric[]).map(
  (value) => ({ value, label: METRIC_LABEL[value] }),
)
const BRANCH_OPTIONS = [
  { value: '', label: '전체' },
  ...Object.entries(BRANCH_LABEL).map(([value, label]) => ({ value, label })),
]

/**
 * 추이 달력 탭 — 선택 월 + 다음 달 두 장을 세로로. 일별 등록 · 변경 · 변경률.
 * 월은 [조회] 로 서버에서 받고(‹ › · 이번 달은 누르는 즉시 조회), 기준(등록일 / 예약일)·지표·구분은 받아온 값을 바로 바꿔 그린다.
 */
export function CalendarTab() {
  const filter = useFilter({
    defaults: () => ({ month: currentMonth() }),
    onReset: () => {
      setBasis('rsv')
      setMetric('total')
      setCalBranch('')
    },
  })
  const calMonth = filter.applied.month
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
      <Filter.Root
        filter={filter}
        isFetching={calLoading}
        refetch={daily.refetch}
      >
        <Filter.Bar>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="이전 달"
            disabled={filter.draft.month <= `${DATA_FROM_YEAR}-01`}
            onClick={() =>
              filter.apply({ month: shiftMonth(filter.draft.month, -1) })
            }
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Filter.Month
            {...filter.field('month')}
            min={`${DATA_FROM_YEAR}-01`}
            max={maxMonth()}
            ariaLabel="달력 월"
          />
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="다음 달"
            disabled={filter.draft.month >= maxMonth()}
            onClick={() =>
              filter.apply({ month: shiftMonth(filter.draft.month, 1) })
            }
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => filter.apply({ month: currentMonth() })}
          >
            이번 달
          </Button>
          <span className="mx-1 h-6 w-px bg-gray-200" />
          <Filter.Segment
            value={basis}
            onChange={setBasis}
            options={BASIS_OPTIONS}
            ariaLabel="기준"
          />
          <Filter.Segment
            value={metric}
            onChange={setMetric}
            options={METRIC_OPTIONS}
            ariaLabel="지표"
          />
          <Filter.Segment
            value={calBranch}
            onChange={setCalBranch}
            options={BRANCH_OPTIONS}
            ariaLabel="구분"
          />
          <Filter.Actions />
        </Filter.Bar>
      </Filter.Root>
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
