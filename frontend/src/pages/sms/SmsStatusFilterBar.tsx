import { STATUS_FILTERS, groupOptionsOf, type StatusFilter } from './smsTableModel'
import type { SmsTemplate } from '@/api/sms'

/**
 * 필터 바 — 발송과 대상 적재는 자동화(큐)가 맡으므로, 이 줄에는 점검용 필터만 둔다.
 * 이미 조회한 행을 걸러내는 클라이언트 필터라 [조회] 없이 즉시 반영된다.
 *
 * 칩에 건수를 적지 않는다. 두 필터가 서로를 반영하지 않아(상태 건수는 분류를 무시하고,
 * 분류 건수는 상태를 무시한다) 화면에 보이는 행 수와 어긋난다 — 틀린 숫자를 붙여 두느니
 * 뺀다. 지금 보이는 건수는 툴바의 결과 수가 말해준다.
 */
export function SmsStatusFilterBar({
  templates, statusFilter, onChange, selectedCount, groupFilter, onGroupChange,
}: {
  templates: SmsTemplate[]
  statusFilter: StatusFilter
  onChange: (value: StatusFilter) => void
  selectedCount: number
  /** 수술 분류 필터 — 빈 문자열이면 전체. 서버 그룹 코드(SMILE·ICL…)를 쓴다. */
  groupFilter: string
  onGroupChange: (value: string) => void
}) {
  const groupOptions = groupOptionsOf(templates)
  const chip = (active: boolean) =>
    `whitespace-nowrap border-l border-border/70 px-2.5 text-xs font-medium transition-colors first:border-l-0 ${
      active ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
    }`

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-gray-50/70 px-2.5 py-2 text-xs shadow-sm">
      <div
        role="group"
        aria-label="상태 필터"
        className="flex h-8 overflow-hidden rounded-md border border-border/80 bg-white"
      >
        {STATUS_FILTERS.map((option) => {
          // '점검 필요'만 상태를 가로지르는 탭이라 평소에도 빨갛게 둔다 — 이 화면의 본업이라
          // 다른 탭 사이에 회색으로 묻히면 찾지 않게 된다.
          const alert = option === '점검 필요'
          return (
            <button
              key={option}
              type="button"
              aria-pressed={statusFilter === option}
              title={alert ? '실패·미발송·미도달 — 사람이 손봐야 하는 행만 모아 봅니다' : undefined}
              onClick={() => onChange(option)}
              className={`${chip(statusFilter === option)} ${alert && statusFilter !== option ? 'text-red-600 hover:bg-red-50' : ''}`}
            >
              {option}
            </button>
          )
        })}
      </div>

      {/* 수술 분류 — 상태 탭과 같은 모양의 세그먼트. 시력교정 4대 분류(스마일·라식·라섹·렌즈삽입)를
          이번달 데이터 존재 여부와 무관하게 늘 노출한다. 이유는 groupOptionsOf 주석 참고. */}
      <div
        role="group"
        aria-label="수술 분류 필터"
        className="flex h-8 overflow-hidden rounded-md border border-border/80 bg-white"
      >
        {[{ code: '', label: '전체' }, ...groupOptions].map((opt) => (
          <button
            key={opt.code || 'all'}
            type="button"
            aria-pressed={groupFilter === opt.code}
            onClick={() => onGroupChange(opt.code)}
            className={chip(groupFilter === opt.code)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 선택 건수 — 홀딩/해제 대상이 몇 명인지. 고른 게 없으면 자리도 차지하지 않는다. */}
      {selectedCount > 0 && (
        <span className="font-semibold text-gray-800">
          선택 <span className="tabular-nums text-blue-700">{selectedCount}</span>명
        </span>
      )}

    </div>
  )
}
