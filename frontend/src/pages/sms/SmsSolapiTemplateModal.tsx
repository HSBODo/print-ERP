import { useMemo, useState } from 'react'
import { Loader2, RefreshCw, X } from 'lucide-react'
import { useSolapiTemplates } from '@/hooks/sms/useSmsManagement'
import type { SmsSolapiTemplate } from '@/api/sms'

/**
 * 솔라피 알림톡 템플릿 조회 모달 — env 에 templateId 가 채워진 슬롯만 카카오에서
 * 실시간 조회해 검수 상태·이름·본문을 보여준다. 발송이 실제로 나갈 문구가 무엇인지,
 * 지금 승인 상태인지 관리자가 한 번에 확인하는 용도.
 *
 * <p>env 에 ID 자체가 없는 슬롯은 목록에서 제외한다(사용자 요구 — 준비 안 된 슬롯을
 * 화면에 띄우면 "왜 여기만 비었지?" 로 오히려 혼란).
 *
 * <p>API 호출 실패한 개별 슬롯은 {@code found=false} 로 배지에 표시하고 사유를 함께 노출.
 * API 키 미설정이면 응답이 빈 배열이라 상단 안내로 유도한다.
 *
 * <p>수술 분류·차수·검수 상태로 필터링 지원 — 슬롯이 많아지면 준비 상태를 빠르게 훑기 위해.
 */

/** 카카오 검수 상태 배지 색상. 알 수 없는 값은 회색으로. */
const STATUS_META: Record<string, { label: string; className: string }> = {
  APPROVED:   { label: '승인 완료',  className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  INSPECTING: { label: '검수 중',    className: 'bg-amber-100 text-amber-700 border-amber-200' },
  PENDING:    { label: '대기',       className: 'bg-slate-100 text-slate-700 border-slate-200' },
  REJECTED:   { label: '반려',       className: 'bg-red-100 text-red-700 border-red-200' },
}

/** 알림톡 메시지 타입 — 카카오 분류(정보성/부가정보/채널추가/혼합). */
const MESSAGE_TYPE_META: Record<string, string> = {
  BASIC:       '기본형',
  EXTRA_INFO:  '부가정보',
  CHANNEL_ADD: '채널추가',
  MIXED:       '혼합형',
}

/** 그룹 라벨 → 표시 순서. env 정의 순서(SMILE·LASIK·LASEK·ICL·ETC)를 따른다. */
const GROUP_ORDER: Record<string, number> = { SMILE: 0, LASIK: 1, LASEK: 2, ICL: 3, ETC: 4 }

/** 그룹 필터 옵션 — 라벨은 그룹 표시명과 동일하게 유지(수술 분류 컬럼과 대사). */
const GROUP_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'ALL',   label: '전체' },
  { value: 'SMILE', label: '스마일수술' },
  { value: 'LASIK', label: '라식' },
  { value: 'LASEK', label: '라섹' },
  { value: 'ICL',   label: '렌즈삽입' },
  { value: 'ETC',   label: '기타' },
]

/** 검수 상태 필터 옵션 — 조회 실패(found=false)도 별도 값으로 필터할 수 있게 한다. */
const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'ALL',        label: '전체' },
  { value: 'APPROVED',   label: '승인 완료' },
  { value: 'INSPECTING', label: '검수 중' },
  { value: 'PENDING',    label: '대기' },
  { value: 'REJECTED',   label: '반려' },
  { value: 'NOT_FOUND',  label: '조회 실패' },
]

const TIER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'ALL', label: '전체' },
  { value: '1',   label: '1차' },
  { value: '2',   label: '2차' },
  { value: '3',   label: '3차' },
]

/**
 * 본문에 등장하는 <code>#{...}</code> 를 순서대로 뽑아 중복 없이 돌려준다.
 * 발송 시 백엔드 {@code SmsSendService} 가 {@code #{name}}·{@code #{surgeryDate}} 를 실제 값으로 치환한다.
 */
function extractSubstitutionTokens(content: string | null | undefined): string[] {
  if (!content) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const match of content.matchAll(/#\{[^}]+\}/g)) {
    if (!seen.has(match[0])) {
      seen.add(match[0])
      out.push(match[0])
    }
  }
  return out
}

export function SmsSolapiTemplateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const query = useSolapiTemplates(open)
  const [groupFilter, setGroupFilter] = useState<string>('ALL')
  const [tierFilter, setTierFilter] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')

  const rows = useMemo(() => {
    const raw = (query.data ?? []).slice().sort((a, b) => {
      const g = (GROUP_ORDER[a.groupCode] ?? 99) - (GROUP_ORDER[b.groupCode] ?? 99)
      if (g !== 0) return g
      return a.tier - b.tier
    })
    return raw.filter((r) => {
      if (groupFilter !== 'ALL' && r.groupCode !== groupFilter) return false
      if (tierFilter !== 'ALL' && String(r.tier) !== tierFilter) return false
      if (statusFilter !== 'ALL') {
        // 조회 실패는 status 가 아니라 found=false 로 표현되므로 별도 분기.
        if (statusFilter === 'NOT_FOUND') { if (r.found) return false }
        else if (!r.found || r.status !== statusFilter) return false
      }
      return true
    })
  }, [query.data, groupFilter, tierFilter, statusFilter])

  if (!open) return null

  const totalCount = query.data?.length ?? 0
  const filtered = groupFilter !== 'ALL' || tierFilter !== 'ALL' || statusFilter !== 'ALL'
  const emptyReason = !query.isLoading && !query.isError && totalCount === 0
    ? '설정된 알림톡 템플릿이 없습니다 — SOLAPI_API_KEY·SOLAPI_TPL_*_ID 를 확인하세요.'
    : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="솔라피 알림톡 템플릿"
    >
      <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between bg-blue-600 px-5 py-3.5">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[15px] font-bold text-white">알림톡 템플릿</h2>
            <span className="text-[12px] text-blue-100">솔라피 실시간 조회</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-1 rounded px-2 py-1 text-[12px] text-white/90 transition-colors hover:bg-white/15 disabled:opacity-50"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
              title="솔라피에서 다시 조회"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${query.isFetching ? 'animate-spin' : ''}`} />
              새로고침
            </button>
            <button
              type="button"
              aria-label="닫기"
              className="rounded p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="shrink-0 border-b border-border/60 bg-blue-50/60 px-5 py-2 text-[12px] text-blue-800">
          템플릿 ID 가 <b className="font-semibold">.env 에 설정된 슬롯만</b> 표시됩니다.
          본문은 카카오 승인 원문이며, 발송 시 <code className="rounded bg-white px-1">#{'{name}'}</code>·
          <code className="rounded bg-white px-1">#{'{surgeryDate}'}</code> 이 치환됩니다.
        </p>

        {/* 필터 바 — 슬롯이 많아지면 관리자가 특정 그룹·차수·검수 상태만 훑을 수 있어야 한다. */}
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border/60 bg-gray-50/70 px-5 py-2.5 text-[12px]">
          <FilterSelect label="수술 분류" value={groupFilter} onChange={setGroupFilter} options={GROUP_OPTIONS} />
          <FilterSelect label="차수" value={tierFilter} onChange={setTierFilter} options={TIER_OPTIONS} />
          <FilterSelect label="검수 상태" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          <div className="ml-auto flex items-center gap-2 text-[11.5px] text-muted-foreground">
            <span className="tabular-nums">
              {filtered ? `${rows.length} / ${totalCount}` : `${totalCount}`}건
            </span>
            {filtered && (
              <button
                type="button"
                className="rounded border border-border bg-white px-2 py-0.5 text-[11px] text-gray-700 hover:bg-gray-50"
                onClick={() => {
                  setGroupFilter('ALL')
                  setTierFilter('ALL')
                  setStatusFilter('ALL')
                }}
              >
                초기화
              </button>
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {query.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> 솔라피에서 조회 중…
            </div>
          ) : query.isError ? (
            <div className="px-5 py-6 text-sm text-red-600">
              조회 실패: {query.error instanceof Error ? query.error.message : String(query.error)}
            </div>
          ) : emptyReason ? (
            <div className="px-5 py-8 text-sm text-muted-foreground">{emptyReason}</div>
          ) : rows.length === 0 ? (
            <div className="px-5 py-8 text-sm text-muted-foreground">
              필터에 걸린 결과가 없습니다.
            </div>
          ) : (
            <table className="w-full min-w-[720px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b-2 border-gray-300 bg-gray-50 text-left text-gray-700">
                  <th className="px-3 py-2 font-semibold">수술 분류</th>
                  <th className="px-3 py-2 font-semibold">차수</th>
                  <th className="px-3 py-2 font-semibold">템플릿 이름</th>
                  <th className="px-3 py-2 font-semibold">검수 상태</th>
                  <th className="px-3 py-2 font-semibold">타입</th>
                  <th className="px-3 py-2 font-semibold">치환문자</th>
                  <th className="px-3 py-2 font-semibold">본문</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <TemplateRow key={`${row.groupCode}-${row.tier}`} row={row} />
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end border-t border-border/60 bg-gray-50/70 px-5 py-3">
          <button
            type="button"
            className="rounded-lg border border-border bg-white px-3 py-1.5 text-[13px] font-semibold text-gray-700 hover:bg-gray-50"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

/** 라벨 + select 짝. select 폭은 라벨 길이에 좌우되지 않도록 min-w. */
function FilterSelect({
  label, value, onChange, options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="text-gray-600">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-7 min-w-[6rem] rounded-md border border-border bg-white px-2 text-[12px] text-gray-800"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}

function TemplateRow({ row }: { row: SmsSolapiTemplate }) {
  return (
    <tr className="border-b border-gray-200 align-top hover:bg-gray-50/40">
      <td className="px-3 py-3">
        <div className="text-[13px] font-semibold text-gray-900">{row.groupLabel}</div>
        <div className="text-[11px] text-gray-500">{row.groupCode}</div>
      </td>
      <td className="px-3 py-3 text-[13px] tabular-nums text-gray-700">{row.tier}차</td>
      <td className="px-3 py-3">
        <div className="text-[13px] text-gray-800">{row.name ?? <span className="text-gray-400">—</span>}</div>
        <div className="mt-0.5 font-mono text-[11px] text-gray-500">{row.templateId}</div>
      </td>
      <td className="px-3 py-3">
        <StatusBadge row={row} />
      </td>
      <td className="px-3 py-3 text-[12px] text-gray-700">
        {row.messageType ? (MESSAGE_TYPE_META[row.messageType] ?? row.messageType) : '—'}
      </td>
      <td className="px-3 py-3">
        <SubstitutionTokens content={row.content} />
      </td>
      <td className="px-3 py-3">
        {row.content ? (
          <pre className="max-w-[420px] whitespace-pre-wrap break-words font-sans text-[12.5px] leading-relaxed text-gray-700">
            {row.content}
          </pre>
        ) : row.errorMessage ? (
          <div className="max-w-[420px] whitespace-pre-wrap break-words text-[12px] text-red-600">
            {row.errorMessage}
          </div>
        ) : (
          <span className="text-[12px] text-gray-400">—</span>
        )}
      </td>
    </tr>
  )
}

/** 본문에서 뽑은 #{...} 자리표시자를 나열. 없으면 대시. */
function SubstitutionTokens({ content }: { content: string | null | undefined }) {
  const tokens = extractSubstitutionTokens(content)
  if (tokens.length === 0) {
    return <span className="text-[12px] text-gray-400">—</span>
  }
  return (
    <div className="flex flex-wrap gap-1">
      {tokens.map((token) => (
        <code
          key={token}
          className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11.5px] text-gray-800"
        >
          {token}
        </code>
      ))}
    </div>
  )
}

function StatusBadge({ row }: { row: SmsSolapiTemplate }) {
  if (!row.found) {
    return (
      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
        조회 실패
      </span>
    )
  }
  const meta = row.status ? STATUS_META[row.status] : undefined
  const label = meta?.label ?? row.status ?? '알 수 없음'
  const cls = meta?.className ?? 'bg-slate-100 text-slate-700 border-slate-200'
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {label}
    </span>
  )
}
