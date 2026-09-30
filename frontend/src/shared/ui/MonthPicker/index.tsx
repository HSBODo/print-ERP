import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

/**
 * 공용 월 선택기 — `<input type="month">` 전면 교체용.
 *
 * 네이티브를 버린 이유:
 *   - 브라우저마다 다르다. Safari(맥)는 month 입력을 아예 지원하지 않아 맨 텍스트칸이 된다.
 *   - 팝업 스타일을 제어할 수 없어 대시보드 톤과 어긋난다.
 *   - 미래 월 비활성 같은 규칙을 UI 로 보여줄 수 없다(max 는 막긴 하지만 회색 표시가 안 된다).
 *
 * 동작 (2026-08-07 확정 스펙):
 *   - 달력 아이콘 버튼 → 연도 네비(‹ 2026 ›) + 4×3 월 그리드 팝오버
 *   - 선택 월 = 파랑 채움 · 이번 달 = 파랑 테두리 · 범위 밖(기본: 미래 월) = 비활성
 *   - 하단 삭제(기본 월로 복원) · 이번 달 액션, 바깥 클릭/Esc 로 닫힘
 *   - 월을 고르면 즉시 onChange — 부모의 draft 상태가 갱신되므로 제목 옆 배지 등이 같이 따라온다.
 *     (조회 버튼이 있는 화면은 기존처럼 조회를 눌러야 데이터가 바뀐다.)
 */

const pad = (n: number) => String(n).padStart(2, '0')
const thisMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

interface MonthPickerProps {
  /** 'YYYY-MM' */
  value: string
  onChange: (value: string) => void
  /** 삭제(복원) 대상. 없으면 이번 달로 복원한다 */
  defaultValue?: string
  /** 선택 가능 범위. 기본 2024-01(마트 데이터 시작) ~ 이번 달(미래 월 비활성) */
  min?: string
  max?: string
  ariaLabel?: string
  id?: string
  /** 트리거 버튼 클래스 보정(높이 등). 기본 h-8 텍스트 xs */
  className?: string
}

export function MonthPicker({
  value,
  onChange,
  defaultValue,
  min = '2024-01',
  max = thisMonth(),
  ariaLabel,
  id,
  className,
}: MonthPickerProps) {
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
  const today = thisMonth()
  const minYear = Number(min.slice(0, 4))
  const maxYear = Number(max.slice(0, 4))
  const label = selYear && selMonth ? `${selYear}년 ${selMonth}월` : value

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        id={id}
        aria-label={ariaLabel}
        aria-expanded={open}
        onClick={toggle}
        className={
          className ??
          'flex h-8 items-center gap-1.5 rounded-md border border-border/80 bg-white px-2.5 text-xs text-gray-800 outline-none transition-colors hover:border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
        }
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
              const ym = `${viewYear}-${pad(m)}`
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
          <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2">
            <button
              type="button"
              title="기본 월로 복원"
              onClick={() => pick(defaultValue ?? today)}
              className="text-[12px] font-medium text-slate-500 transition-colors hover:text-slate-800"
            >
              삭제
            </button>
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
