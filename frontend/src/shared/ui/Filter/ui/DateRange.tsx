import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

import { cn } from '#shared/utils/cn'
import {
  addDays,
  type DateRange as Range,
  daysBetween,
  parseIsoDate,
  toIsoDate,
} from '#shared/utils/date'

interface Props {
  value: Range
  onChange: (range: Range) => void
  /** 선택 가능한 최대 일수. 넘으면 [적용] 이 잠긴다 (서버 제한과 맞춘다) */
  maxDays?: number
  /** 'YYYY-MM-DD' 선택 가능 범위 */
  min?: string
  max?: string
  ariaLabel?: string
}

const startOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), 1)
const endOfMonth = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0)
const addMonths = (date: Date, delta: number) =>
  new Date(date.getFullYear(), date.getMonth() + delta, 1)

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** 해당 월 격자(앞뒤 달 채움 포함). 마지막 주가 전부 다음 달이면 5주만 그린다. */
const buildGrid = (view: Date) => {
  const first = startOfMonth(view)
  const lead = first.getDay()
  const cells: { date: Date; iso: string; outside: boolean }[] = []
  for (let i = 0; i < 42; i += 1) {
    const date = addDays(first, i - lead)
    cells.push({
      date,
      iso: toIsoDate(date),
      outside: date.getMonth() !== view.getMonth(),
    })
  }
  const weeks: (typeof cells)[] = []
  for (let i = 0; i < 42; i += 7) weeks.push(cells.slice(i, i + 7))
  if (weeks[5].every((cell) => cell.outside)) weeks.pop()
  return weeks
}

/**
 * 조회 기간 선택 — 트리거 버튼 + 달력 팝오버.
 * 팝오버 안에서 고른 값은 [적용]을 눌러야 onChange 로 나간다.
 */
export function DateRange({
  value: { from, to },
  onChange,
  maxDays,
  min,
  max,
  ariaLabel = '조회 기간',
}: Props) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => startOfMonth(parseIsoDate(from)))
  const [monthOpen, setMonthOpen] = useState(false)
  const [start, setStart] = useState(from)
  const [end, setEnd] = useState<string | null>(to)
  const [hover, setHover] = useState<string | null>(null)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const todayIso = toIsoDate(new Date())

  const close = useCallback(() => {
    setOpen(false)
    setMonthOpen(false)
    setHover(null)
  }, [])

  // 트리거 기준으로 위치를 잡는다. 툴바가 overflow 컨테이너라 포털로 띄운다.
  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = 312
    const height = panelRef.current?.offsetHeight ?? 400
    const below = rect.bottom + 6
    const flip =
      below + height > window.innerHeight - 8 && rect.top - height - 6 > 8
    setPos({
      top: flip ? rect.top - height - 6 : below,
      left: Math.min(Math.max(8, rect.left), window.innerWidth - width - 8),
    })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    place()
  }, [open, place, monthOpen, view, start, end])

  useEffect(() => {
    if (!open) return
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (
        panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      )
        return
      close()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    const onViewport = () => place()
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onViewport)
    window.addEventListener('scroll', onViewport, true)
    return () => {
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onViewport)
      window.removeEventListener('scroll', onViewport, true)
    }
  }, [open, close, place])

  const weeks = useMemo(() => buildGrid(view), [view])

  // 종료일 미선택 상태에서는 마우스 위치를 임시 종료일로 써서 구간을 미리 보여준다.
  const previewEnd = end ?? hover
  const lo = previewEnd && previewEnd < start ? previewEnd : start
  const hi = previewEnd && previewEnd < start ? start : previewEnd

  const spanDays = end ? daysBetween(start, end) : 0
  const overLimit = Boolean(maxDays && spanDays > maxDays)
  const canApply = Boolean(end) && !overLimit

  const pick = (iso: string) => {
    // 시작일만 잡힌 상태에서 그 이전 날짜를 누르면 시작일을 다시 지정한다.
    if (!end && iso >= start) {
      setEnd(iso)
      return
    }
    setStart(iso)
    setEnd(null)
  }

  const applyRange = (range: Range) => {
    setStart(range.from)
    setEnd(range.to)
    setHover(null)
    setView(startOfMonth(parseIsoDate(range.from)))
  }

  const now = new Date()
  const PRESETS: { label: string; range: () => Range }[] = [
    { label: '오늘', range: () => ({ from: todayIso, to: todayIso }) },
    {
      label: '최근 7일',
      range: () => ({ from: toIsoDate(addDays(now, -6)), to: todayIso }),
    },
    {
      label: '이번 달',
      range: () => ({
        from: toIsoDate(startOfMonth(now)),
        to: toIsoDate(endOfMonth(now)),
      }),
    },
    {
      label: '지난 달',
      range: () => ({
        from: toIsoDate(startOfMonth(addMonths(now, -1))),
        to: toIsoDate(endOfMonth(addMonths(now, -1))),
      }),
    },
    {
      label: '최근 3개월',
      range: () => ({
        from: toIsoDate(addDays(addMonths(now, -2), now.getDate() - 1)),
        to: todayIso,
      }),
    },
  ]
  // 프리셋도 선택 가능 범위(min·max) 안으로 자른다 — 예: max=오늘이면 '이번 달'은 1일~오늘.
  const clamp = ({ from: lo, to: hi }: Range): Range => ({
    from: min && lo < min ? min : lo,
    to: max && hi > max ? max : hi,
  })
  const presetRanges = PRESETS.map((preset) => ({
    label: preset.label,
    range: clamp(preset.range()),
  }))
  const activePreset = presetRanges.find(
    ({ range }) => range.from === start && range.to === end,
  )?.label

  const panel = pos && (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="조회 기간 선택"
      style={{ top: pos.top, left: pos.left, width: 312 }}
      className="fixed z-50 rounded-2xl border border-border/70 bg-white p-3.5 text-xs shadow-[0_12px_28px_-4px_rgba(16,24,40,0.14),0_4px_8px_-2px_rgba(16,24,40,0.06)]"
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setMonthOpen((value) => !value)}
          aria-expanded={monthOpen}
          className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[13px] font-bold text-gray-900 hover:bg-gray-100"
        >
          {view.getFullYear()}년 {view.getMonth() + 1}월
          <ChevronDown
            className={cn(
              'h-3 w-3 text-gray-500 transition-transform',
              monthOpen && 'rotate-180',
            )}
          />
        </button>
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            onClick={() => setView(addMonths(view, -1))}
            aria-label="이전 달"
            className="grid h-6.5 w-6.5 place-items-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setView(addMonths(view, 1))}
            aria-label="다음 달"
            className="grid h-6.5 w-6.5 place-items-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {monthOpen ? (
        <div className="mt-3">
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setView(addMonths(view, -12))}
              aria-label="이전 해"
              className="grid h-6 w-6 place-items-center rounded-md hover:bg-gray-100"
            >
              <ChevronLeft className="h-3.5 w-3.5 text-gray-600" />
            </button>
            <span className="font-semibold tabular-nums text-gray-900">
              {view.getFullYear()}년
            </span>
            <button
              type="button"
              onClick={() => setView(addMonths(view, 12))}
              aria-label="다음 해"
              className="grid h-6 w-6 place-items-center rounded-md hover:bg-gray-100"
            >
              <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
            </button>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {Array.from({ length: 12 }, (_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setView(new Date(view.getFullYear(), index, 1))
                  setMonthOpen(false)
                }}
                className={cn(
                  'h-8 rounded-lg text-[12px] font-medium hover:bg-gray-100',
                  index === view.getMonth()
                    ? 'bg-blue-600 text-white hover:bg-blue-600'
                    : 'text-gray-700',
                )}
              >
                {index + 1}월
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="mt-2.5 grid grid-cols-7">
            {WEEKDAYS.map((day, index) => (
              <span
                key={day}
                className={cn(
                  'grid h-6 place-items-center text-[11px] font-medium',
                  index === 0
                    ? 'text-rose-500'
                    : index === 6
                      ? 'text-blue-500'
                      : 'text-gray-500',
                )}
              >
                {day}
              </span>
            ))}
          </div>
          <div className="mt-0.5" onMouseLeave={() => setHover(null)}>
            {weeks.map((week) => (
              <div key={week[0].iso} className="grid grid-cols-7">
                {week.map((cell, index) => {
                  const blocked = Boolean(
                    (min && cell.iso < min) || (max && cell.iso > max),
                  )
                  const banded =
                    Boolean(hi) && cell.iso >= lo && cell.iso <= (hi as string)
                  const isStart = banded && cell.iso === lo
                  const isEnd = banded && cell.iso === hi
                  const single = !end && cell.iso === start
                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      disabled={blocked}
                      onMouseEnter={() => {
                        if (!end && !blocked) setHover(cell.iso)
                      }}
                      onClick={() => {
                        if (!blocked) pick(cell.iso)
                      }}
                      className={cn(
                        'relative h-8.5 text-[12px] tabular-nums transition-colors',
                        banded && 'bg-blue-50',
                        banded &&
                          (isStart || index === 0) &&
                          'rounded-l-[10px]',
                        banded && (isEnd || index === 6) && 'rounded-r-[10px]',
                        blocked && 'cursor-not-allowed',
                      )}
                    >
                      <span
                        className={cn(
                          'absolute inset-x-px inset-y-0.5 grid place-items-center rounded-[9px]',
                          cell.outside ? 'text-gray-300' : 'text-gray-700',
                          blocked && 'text-gray-200',
                          !blocked &&
                            !isStart &&
                            !isEnd &&
                            !single &&
                            'hover:bg-gray-100',
                          cell.iso === todayIso &&
                            !isStart &&
                            !isEnd &&
                            !single &&
                            'font-semibold text-blue-600 ring-1 ring-inset ring-blue-200',
                          (isStart || isEnd || single) &&
                            'bg-blue-600 font-bold text-white',
                        )}
                      >
                        {cell.date.getDate()}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-3 border-t border-gray-100 pt-3">
        <div className="flex flex-wrap gap-1.5">
          {presetRanges.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyRange(preset.range)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                activePreset === preset.label
                  ? 'border-blue-200 bg-blue-50 text-blue-600'
                  : 'border-transparent bg-gray-100 text-gray-500 hover:bg-gray-200',
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="mt-2.5 flex items-center gap-1.5">
          <strong className="text-[11.5px] tabular-nums text-gray-900">
            {start}
          </strong>
          <span className="text-gray-400">~</span>
          <strong
            className={cn(
              'text-[11.5px] tabular-nums',
              end ? 'text-gray-900' : 'text-gray-300',
            )}
          >
            {end ?? '종료일 선택'}
          </strong>
          {end && (
            <span className="ml-auto text-[11px] text-gray-400">
              {spanDays.toLocaleString()}일간
            </span>
          )}
        </div>

        {overLimit && (
          <p className="mt-1.5 text-[11px] text-rose-600">
            최대 {maxDays}일까지 조회할 수 있습니다.
          </p>
        )}

        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={close}
            className="ml-auto rounded-lg border border-border/80 px-3.5 py-1.5 text-[11.5px] font-medium text-gray-600 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            disabled={!canApply}
            onClick={() => {
              if (!end) return
              onChange({ from: lo, to: hi as string })
              close()
            }}
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-[11.5px] font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            적용
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`${ariaLabel} ${from} ~ ${to}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (open) {
            close()
            return
          }
          setStart(from)
          setEnd(to)
          setHover(null)
          setMonthOpen(false)
          setView(startOfMonth(parseIsoDate(from)))
          setOpen(true)
        }}
        className={cn(
          'flex h-8 items-center gap-2 rounded-md border border-border/80 bg-white px-2.5 text-xs text-gray-800 outline-none transition-colors hover:border-blue-300',
          open && 'border-blue-400 ring-2 ring-blue-100',
        )}
      >
        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-gray-400" />
        <span className="tabular-nums">{from}</span>
        <span className="text-gray-300">~</span>
        <span className="tabular-nums">{to}</span>
        <ChevronDown
          className={cn(
            'ml-0.5 h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && createPortal(panel, document.body)}
    </>
  )
}
