import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { currentMonth, pad2 } from '#shared/utils/date'

interface Props {
  /** 'YYYY-MM' */
  value: string
  onChange: (value: string) => void
  /** 선택 가능 범위. 기본 2024-01(마트 데이터 시작) ~ 이번 달(미래 월 비활성) */
  min?: string
  max?: string
  ariaLabel?: string
}

/**
 * 월 선택 — 트리거 버튼 + 연도 내비·4×3 월 그리드 팝오버.
 * 네이티브 `<input type="month">` 는 Safari 가 지원하지 않고 팝업 스타일도 못 바꿔서 쓰지 않는다.
 * 선택 월 = 파랑 채움 · 이번 달 = 파랑 테두리 · 범위 밖 = 비활성. 고르는 즉시 onChange.
 */
export function Month({
  value,
  onChange,
  min = '2024-01',
  max = currentMonth(),
  ariaLabel = '조회 월',
}: Props) {
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(
    () => Number(value.slice(0, 4)) || new Date().getFullYear(),
  )
  const rootRef = useRef<HTMLDivElement>(null)

  // 바깥 클릭·Esc 로 닫는다. 열려 있을 때만 리스너를 단다.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = () => {
    // 열 때마다 선택된 값의 연도로 되돌린다 — 지난번에 넘겨 둔 연도가 남아 있으면 혼란스럽다.
    if (!open)
      setViewYear(Number(value.slice(0, 4)) || new Date().getFullYear())
    setOpen((o) => !o)
  }

  const pick = (ym: string) => {
    onChange(ym)
    setOpen(false)
  }

  const [selYear, selMonth] = value.split('-').map(Number)
  const today = currentMonth()
  const minYear = Number(min.slice(0, 4))
  const maxYear = Number(max.slice(0, 4))
  const label = selYear && selMonth ? `${selYear}년 ${selMonth}월` : value

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={toggle}
        className="flex h-8 items-center gap-1.5 rounded-md border border-border/80 bg-white px-2.5 text-xs text-gray-800 outline-none transition-colors hover:border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
      >
        <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
        <span className="font-medium tabular-nums">{label}</span>
        <ChevronDown
          className={`h-3 w-3 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-[248px] rounded-xl border border-border/70 bg-white p-3 shadow-lg">
          {/* 연도 내비 */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="이전 연도"
              onClick={() => setViewYear((y) => y - 1)}
              disabled={viewYear <= minYear}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-200"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[13px] font-bold tabular-nums text-slate-900">
              {viewYear}
            </span>
            <button
              type="button"
              aria-label="다음 연도"
              onClick={() => setViewYear((y) => y + 1)}
              disabled={viewYear >= maxYear}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-200"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* 4×3 월 그리드 */}
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: 12 }, (_, i) => {
              const m = i + 1
              const ym = `${viewYear}-${pad2(m)}`
              const disabled = ym < min || ym > max
              const selected = viewYear === selYear && m === selMonth
              const isToday = ym === today
              return (
                <button
                  key={m}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(ym)}
                  className={`h-9 rounded-md text-[12.5px] tabular-nums transition-colors ${
                    selected
                      ? 'bg-blue-700 font-bold text-white'
                      : disabled
                        ? 'cursor-not-allowed text-slate-300'
                        : isToday
                          ? 'border border-blue-400 font-semibold text-blue-700 hover:bg-blue-50'
                          : 'font-medium text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {m}
                </button>
              )
            })}
          </div>

          {/* 하단 액션 */}
          <div className="mt-2 flex items-center justify-end border-t border-border/50 pt-2">
            <button
              type="button"
              onClick={() => pick(today)}
              className="text-[12px] font-semibold text-blue-700 transition-colors hover:text-blue-800"
            >
              이번 달
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
