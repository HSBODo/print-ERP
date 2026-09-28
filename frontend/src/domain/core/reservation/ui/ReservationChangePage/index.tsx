import { useState } from 'react'
import { CalendarTab } from './ui/CalendarTab'
import { DetailTab } from './ui/DetailTab'

const DATA_FROM_YEAR = 2022

const TABS = [
  { key: 'detail' as const, label: '변경 상세' },
  { key: 'calendar' as const, label: '추이 달력' },
]

const SUBTITLE: Record<'detail' | 'calendar', string> = {
  detail: `검사예약(시력교정·드림렌즈·백내장) 중 예약일이 1회 이상 바뀐 건 · 취소·미내원 포함 · 등록일 ${DATA_FROM_YEAR}-01 ~`,
  calendar: '일별 등록 건수 · 예약일이 바뀐 건수 · 변경률. 예약일 기준은 그 날로 잡혀 있는 예약(미래 달 포함), 등록일 기준은 그 날 등록된 예약. 명절 당일 ±5일은 호박색 테두리.',
}

/**
 * 예약 변경이력 — 검사예약(시력교정·드림렌즈·백내장)의 예약일이 언제, 어떻게 바뀌었는지.
 * 탭 ① 변경 상세: 등록 연도(또는 전체) 범위 하나를 서버에서 받고 나머지 필터는 [조회] 로 클라이언트 적용.
 * 탭 ② 추이 달력: 선택 월 + 다음 달 두 장을 세로로 — 일별 등록·변경·변경률(등록일/예약일 기준). 기획서 §6 추이 그래프의 달력판.
 *
 * 탭별 state·훅은 각 하위 컴포넌트에 캡슐화되어 있어 이 컨테이너는 탭 전환만 담당한다.
 */
export function ReservationChangePage() {
  const [tab, setTab] = useState<'detail' | 'calendar'>('detail')

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[32rem] flex-col gap-2 overflow-hidden text-xs text-gray-800">
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`h-7 rounded-md px-3 text-xs font-semibold transition-colors ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-gray-500">{SUBTITLE[tab]}</span>
      </div>

      {tab === 'detail' ? <DetailTab /> : <CalendarTab />}
    </div>
  )
}
